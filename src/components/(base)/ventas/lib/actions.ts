"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  CrearSolicitudRebajaSchema,
  Cliente,
  SolicitudRebajaPayloadSchema,
  MotivoModificacionVentaSchema,
  type ComercialVenta,
  type GenericoVenta,
} from "./zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { sendPushNotification } from "@/utils/pushServer";
import { sendPushToRoles, sendPushToUsers } from "@/utils/push-utils";
import {
  esRebajaDePrecio,
  fechaVentaCalendarioGt,
  formatNumeroRecibo,
  payloadCoincideConVenta,
  precioMenorQueCosto,
  precioReferenciaRebajaPayload,
  ventaEstaAnulada,
  ETIQUETA_CONSUMIDOR_FINAL,
  codigoReciboVenta,
} from "./helpers";
import {
  construirReporteVentasMes,
  type ReporteVentasMes,
} from "./reporte-ventas-mes";
import {
  fechaCalendarioGt,
  finTimestamptzDiaGt,
  inicioTimestamptzDiaGt,
  ultimoDiaMesCalendario,
} from "@/lib/fechas-gt";
import { enLotes, traerTodo } from "@/lib/reportes/paginacion";
import { lineaGenericaCompraDisplay } from "@/components/(base)/proveedores/lib/compras-helpers";
import {
  construirReporteCorteCaja,
  type ReporteCorteCaja,
} from "./reporte-corte-caja";
import { ajustarStockPorVenta, obtenerCostoReferenciaVenta } from "./lotes-stock";
import {
  asignarCantidadFefo,
  filtrarLotesVendiblesFefo,
  loteVendiblePorFecha,
  type LoteAsignadoVenta,
  type LoteVendibleRow,
} from "./lotes-venta";

const V_INV_GENERICOS_POS =
  "generico_id, catalogo_id, catalogo_nombre, concentracion, forma_farmaceutica, generico_nombre, requiere_receta, stock_minimo, activo, comerciales, comerciales_con_stock, stock_vendible, precio_desde, bajo_minimo";

const V_INV_COMERCIALES_POS =
  "producto_id, nombre_comercial, presentacion, precio_venta, imagen_url, imagen_url_2, imagen_url_3, activo, generico_id, generico_nombre, requiere_receta, catalogo_id, catalogo_nombre, laboratorio_id, laboratorio_nombre, stock_vendible, proximo_vencimiento, lotes_vendibles, concentracion, forma_farmaceutica, unidad_venta, stock_minimo, generico_activo";

function mapFilaGenericoVenta(row: Record<string, unknown>): GenericoVenta {
  return {
    generico_id: String(row.generico_id),
    generico_nombre: String(row.generico_nombre ?? ""),
    catalogo_id: String(row.catalogo_id),
    catalogo_nombre: String(row.catalogo_nombre ?? ""),
    concentracion: String(row.concentracion ?? ""),
    forma_farmaceutica: String(row.forma_farmaceutica ?? ""),
    requiere_receta: Boolean(row.requiere_receta),
    stock_minimo: Number(row.stock_minimo) || 0,
    stock_vendible: Number(row.stock_vendible) || 0,
    bajo_minimo: Boolean(row.bajo_minimo),
    activo: Boolean(row.activo),
  };
}

function mapFilaComercialVenta(row: Record<string, unknown>): ComercialVenta {
  return {
    producto_id: String(row.producto_id),
    nombre_comercial: String(row.nombre_comercial ?? ""),
    presentacion: String(row.presentacion ?? ""),
    laboratorio_nombre:
      row.laboratorio_nombre != null && String(row.laboratorio_nombre).trim() !== ""
        ? String(row.laboratorio_nombre)
        : null,
    precio_venta: Number(row.precio_venta) || 0,
    generico_id: String(row.generico_id),
    stock_vendible: Number(row.stock_vendible) || 0,
    imagen_url: (row.imagen_url as string | null) ?? null,
    imagen_url_2: (row.imagen_url_2 as string | null) ?? null,
    imagen_url_3: (row.imagen_url_3 as string | null) ?? null,
    activo: Boolean(row.activo),
    costo_promedio: null,
  };
}
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin, requireVentas } from "@/lib/auth-guards";
import { isAdminRole, resolveUserRole } from "@/lib/user-role";
import {
  clearAdminCredentialFailures,
  isAdminCredentialRateLimited,
  recordAdminCredentialFailure,
} from "@/lib/rate-limit";
import { modalActionMessage } from "@/components/ui/modal-toast";

export interface ItemVentaInput {
  producto_id: string;
  lote_id?: string | null;
  cantidad: number;
  precio_aplicado: number;
  subtotal: number;
}

function mensajeErrorRegistrarVenta(message: string): string {
  if (message.includes("REBAJA_NO_AUTORIZADA")) {
    return "La rebaja de precio no está autorizada o la solicitud ya no es válida. Solicita aprobación de nuevo.";
  }
  if (message.includes("PRECIO_MENOR_COSTO")) {
    return "Hay un precio por debajo del costo promedio. Solo un administrador puede autorizar esta venta.";
  }
  if (message.includes("CREDITO_VENCIDO:")) {
    const raw = message.split("CREDITO_VENCIDO:")[1]?.trim() ?? "";
    try {
      const resumen = JSON.parse(raw) as {
        total?: number;
        desde?: string | null;
      };
      const total = Number(resumen.total) || 0;
      const desde = resumen.desde ?? "";
      const fecha = desde
        ? new Date(`${desde}T12:00:00`).toLocaleDateString("es-GT", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "—";
      return `Cliente con crédito vencido por Q${total.toFixed(2)} desde ${fecha}`;
    } catch {
      return "Cliente con crédito vencido. No se puede vender a crédito.";
    }
  }
  if (message.includes("RECETA_REQUERIDA")) {
    return "Debes registrar el médico y número de colegiado para medicamentos con receta.";
  }
  return message;
}

export type RecetaVentaInput = {
  medico_nombre: string;
  colegiado: string;
  numero_receta?: string | null;
  fecha_receta?: string | null;
  observaciones?: string | null;
};

export type CreditoVencidoResumen = {
  vencido: boolean;
  total: number;
  desde: string | null;
};

export async function consultarCreditoVencidoCliente(
  clienteId: string,
): Promise<CreditoVencidoResumen> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { vencido: false, total: 0, desde: null };
  }

  const { data, error } = await supabase.rpc("cliente_credito_vencido_resumen", {
    p_cliente_id: clienteId,
  });

  if (error) {
    console.error("cliente_credito_vencido_resumen:", error.message);
    return { vencido: false, total: 0, desde: null };
  }

  const row = data as {
    vencido?: boolean;
    total?: number;
    desde?: string | null;
  } | null;

  return {
    vencido: Boolean(row?.vencido),
    total: Number(row?.total) || 0,
    desde: row?.desde ?? null,
  };
}

export async function obtenerFarmaciaReciboSettings(): Promise<{
  nombre: string;
  direccion: string;
  telefono: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("app_settings")
    .select("farmacia_nombre, farmacia_direccion, farmacia_telefono")
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    nombre: (data.farmacia_nombre as string | null)?.trim() || "FarmaMuni",
    direccion:
      (data.farmacia_direccion as string | null)?.trim() ||
      "3 CALLE 11-090, Zona 1, CHIQUIMULA, CHIQUIMULA",
    telefono: (data.farmacia_telefono as string | null)?.trim() || "",
  };
}

export async function obtenerProductosYClientes() {
  try {
    const supabase = await createClient();

    const { data: genericosRaw, error: genError } = await supabase
      .from("v_inv_genericos")
      .select(V_INV_GENERICOS_POS)
      .eq("activo", true)
      .order("generico_nombre", { ascending: true });

    if (genError) throw new Error(genError.message);

    const { data: comercialesRaw, error: comError } = await supabase
      .from("v_inv_comerciales")
      .select(V_INV_COMERCIALES_POS)
      .eq("activo", true)
      .eq("generico_activo", true)
      .order("nombre_comercial", { ascending: true });

    if (comError) throw new Error(comError.message);

    const genericos = (genericosRaw ?? []).map((row) =>
      mapFilaGenericoVenta(row as Record<string, unknown>),
    );
    const comercialesBase = (comercialesRaw ?? []).map((row) =>
      mapFilaComercialVenta(row as Record<string, unknown>),
    );

    const productoIds = comercialesBase.map((c) => c.producto_id);
    const costoMap = new Map<string, number | null>();
    if (productoIds.length > 0) {
      const { data: costosRaw } = await supabase
        .from("v_inv_costos")
        .select("producto_id, costo_promedio")
        .in("producto_id", productoIds);
      for (const row of costosRaw ?? []) {
        const pid = String(row.producto_id);
        costoMap.set(
          pid,
          row.costo_promedio != null ? Number(row.costo_promedio) : null,
        );
      }
    }

    const comerciales = comercialesBase.map((c) => ({
      ...c,
      costo_promedio: costoMap.get(c.producto_id) ?? null,
    }));

    const { data: clientes, error: cliError } = await supabase
      .from("ven_clientes")
      .select("*")
      .order("nombre", { ascending: true });

    if (cliError) throw new Error(cliError.message);

    return {
      genericos,
      comerciales,
      clientes: clientes || [],
    };
  } catch (error: unknown) {
    console.error("Error en obtenerProductosYClientes:", error);
    throw new Error("No se pudieron cargar los productos o clientes.");
  }
}

// Código de barras y lotes
export async function buscarLotePorCodigoBarras(codigo: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Sesión no válida o expirada." };
    }

    const codigoNorm = codigo.trim();
    if (!codigoNorm) {
      return { success: false as const, error: "Código de barras vacío." };
    }

    const { data: lote, error } = await supabase
      .from("inv_lotes")
      .select(
        "id, producto_id, codigo_barras, numero_lote, cantidad_actual, precio_costo, fecha_vencimiento, ubicacion, activo",
      )
      .eq("codigo_barras", codigoNorm)
      .eq("activo", true)
      .gt("cantidad_actual", 0)
      .maybeSingle();

    if (error) {
      return { success: false as const, error: error.message };
    }
    if (!lote) {
      return { success: false as const, error: "No hay lote activo con stock para ese código." };
    }

    if (!loteVendiblePorFecha(lote.fecha_vencimiento as string | null)) {
      return { success: false as const, error: "El lote está vencido y no se puede vender." };
    }

    const productoId = lote.producto_id as string;
    const { data: comercialRow, error: comercialError } = await supabase
      .from("v_inv_comerciales")
      .select(V_INV_COMERCIALES_POS)
      .eq("producto_id", productoId)
      .maybeSingle();

    if (comercialError || !comercialRow) {
      return { success: false as const, error: "No se encontró el producto comercial del lote." };
    }

    let comercial = mapFilaComercialVenta(comercialRow as Record<string, unknown>);
    if (!comercial.activo || comercial.stock_vendible <= 0) {
      return { success: false as const, error: "El comercial no tiene stock vendible." };
    }

    const { data: costoRow } = await supabase
      .from("v_inv_costos")
      .select("costo_promedio")
      .eq("producto_id", productoId)
      .maybeSingle();
    comercial = {
      ...comercial,
      costo_promedio:
        costoRow?.costo_promedio != null ? Number(costoRow.costo_promedio) : null,
    };

    const { data: genericoRow, error: genericoError } = await supabase
      .from("v_inv_genericos")
      .select(V_INV_GENERICOS_POS)
      .eq("generico_id", comercial.generico_id)
      .maybeSingle();

    if (genericoError || !genericoRow) {
      return { success: false as const, error: "No se encontró el genérico del producto." };
    }

    const generico = mapFilaGenericoVenta(genericoRow as Record<string, unknown>);

    return {
      success: true as const,
      lote: {
        id: lote.id as string,
        producto_id: productoId,
        codigo_barras: lote.codigo_barras as string,
        numero_lote: (lote.numero_lote as string | null) ?? null,
        cantidad_actual: Number(lote.cantidad_actual) || 0,
        precio_costo: Number(lote.precio_costo) || 0,
        precio_venta: comercial.precio_venta,
        fecha_vencimiento: (lote.fecha_vencimiento as string | null) ?? null,
        ubicacion: (lote.ubicacion as string | null) ?? null,
      },
      comercial,
      generico,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al buscar el lote.";
    return { success: false as const, error: message };
  }
}

export async function asignarLotes(productoId: string, cantidad: number) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Sesión no válida o expirada." };
    }

    if (!cantidad || cantidad <= 0) {
      return { success: false as const, error: "La cantidad debe ser mayor a 0." };
    }

    const { data: comercialRow, error: comercialError } = await supabase
      .from("v_inv_comerciales")
      .select(V_INV_COMERCIALES_POS)
      .eq("producto_id", productoId)
      .maybeSingle();

    if (comercialError || !comercialRow) {
      return { success: false as const, error: "Producto comercial no encontrado." };
    }

    const comercial = mapFilaComercialVenta(comercialRow as Record<string, unknown>);
    if (!comercial.activo) {
      return { success: false as const, error: "El producto comercial está inactivo." };
    }

    const { data: lotes, error } = await supabase
      .from("inv_lotes")
      .select(
        "id, codigo_barras, numero_lote, cantidad_actual, precio_costo, fecha_vencimiento, created_at",
      )
      .eq("producto_id", productoId)
      .eq("activo", true)
      .gt("cantidad_actual", 0)
      .order("fecha_vencimiento", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false as const, error: error.message };
    }

    const vendibles = filtrarLotesVendiblesFefo(
      (lotes ?? []).map((l) => ({
        id: l.id as string,
        codigo_barras: l.codigo_barras as string,
        numero_lote: (l.numero_lote as string | null) ?? null,
        cantidad_actual: Number(l.cantidad_actual) || 0,
        precio_costo: Number(l.precio_costo) || 0,
        fecha_vencimiento: (l.fecha_vencimiento as string | null) ?? null,
        created_at: (l.created_at as string | null) ?? null,
      })),
    );

    const resultado = asignarCantidadFefo(vendibles, cantidad, comercial.precio_venta);

    if (!resultado.ok) {
      return {
        success: false as const,
        error: `Stock insuficiente para ${comercial.nombre_comercial}. Disponibles: ${resultado.cantidad_disponible}.`,
        cantidad_disponible: resultado.cantidad_disponible,
      };
    }

    return {
      success: true as const,
      lotes: resultado.asignaciones as LoteAsignadoVenta[],
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "No se pudo asignar lotes.";
    return { success: false as const, error: message };
  }
}

// Reglas al cobrar (permisos y precios)
async function obtenerRolUsuario(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", userId)
    .maybeSingle();
  return profile?.rol ?? "user";
}

async function assertAdminHistorialVentas() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    throw new Error(
      modalActionMessage(
        guard.code,
        "No tienes permiso para modificar ventas del historial.",
      ),
    );
  }
  return guard.user;
}

function parseMotivoModificacionVenta(motivo: string) {
  const parsed = MotivoModificacionVentaSchema.safeParse(motivo);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Motivo inválido.");
  }
  return parsed.data;
}

async function registrarBitacoraVenta(
  supabase: SupabaseClient,
  params: {
    ventaId: string;
    usuarioId: string;
    accion: "editar_linea" | "quitar_linea" | "anular";
    motivo: string;
    detalle?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("ven_ventas_bitacora").insert({
    venta_id: params.ventaId,
    usuario_id: params.usuarioId,
    accion: params.accion,
    motivo: params.motivo,
    detalle: params.detalle ?? {},
  });
  if (error) {
    const msg = error.message ?? "";
    if (
      msg.includes("ven_ventas_bitacora") &&
      (msg.includes("schema cache") || msg.includes("does not exist"))
    ) {
      throw new Error(
        "Falta crear la tabla ven_ventas_bitacora en Supabase. Abre SQL Editor y ejecuta el archivo db/ven_ventas_bitacora.sql del proyecto.",
      );
    }
    throw new Error(`No se pudo registrar la bitácora: ${msg}`);
  }
}

async function precioVentaReferenciaItem(
  supabase: SupabaseClient,
  item: ItemVentaInput,
): Promise<number> {
  const { data: comercial } = await supabase
    .from("v_inv_comerciales")
    .select("precio_venta")
    .eq("producto_id", item.producto_id)
    .maybeSingle();
  if (comercial) {
    return Number(comercial.precio_venta) || 0;
  }
  const { data: prod } = await supabase
    .from("inv_productos")
    .select("precio_base")
    .eq("id", item.producto_id)
    .maybeSingle();
  return Number(prod?.precio_base) || 0;
}

async function itemTieneRebajaEnServidor(
  supabase: SupabaseClient,
  item: ItemVentaInput,
): Promise<boolean> {
  const referencia = await precioVentaReferenciaItem(supabase, item);
  return esRebajaDePrecio(item.precio_aplicado, referencia);
}

async function assertRebajasAutorizadas(
  supabase: SupabaseClient,
  userId: string,
  params: {
    cliente_id: string | null;
    tipo_venta: string;
    total: number;
    observaciones: string | null;
    items: ItemVentaInput[];
    solicitud_rebaja_id?: string;
  },
) {
  let hayRebaja = false;
  for (const item of params.items) {
    if (await itemTieneRebajaEnServidor(supabase, item)) {
      hayRebaja = true;
      break;
    }
  }
  if (!hayRebaja) return;

  if (params.solicitud_rebaja_id) {
    const admin = createAdminClient();
    const { data: solicitud, error } = await admin
      .from("ven_solicitudes_rebaja")
      .select("id, solicitante_id, estado, payload")
      .eq("id", params.solicitud_rebaja_id)
      .maybeSingle();

    if (error || !solicitud) {
      throw new Error("Solicitud de rebaja no encontrada.");
    }
    if (solicitud.solicitante_id !== userId) {
      throw new Error("La solicitud de rebaja no corresponde a tu usuario.");
    }
    if (solicitud.estado !== "aprobada") {
      throw new Error("La rebaja aún no ha sido aprobada por un administrador.");
    }

    const parsedPayload = SolicitudRebajaPayloadSchema.safeParse(solicitud.payload);
    if (!parsedPayload.success) {
      throw new Error("Datos de la solicitud de rebaja inválidos.");
    }

    const coincide = payloadCoincideConVenta(parsedPayload.data, {
      cliente_id: params.cliente_id,
      tipo_venta: params.tipo_venta,
      total: params.total,
      observaciones: params.observaciones,
      items: params.items,
    });
    if (!coincide) {
      throw new Error(
        "El carrito cambió después de la aprobación. Solicita autorización de nuevo.",
      );
    }
    return;
  }

  const rol = await obtenerRolUsuario(supabase, userId);
  if (rol === "admin" || rol === "super") return;

  throw new Error(
    "Hay rebajas de precio. Debes obtener autorización administrativa antes de cobrar.",
  );
}

// Registrar la venta
export async function crearVenta(params: {
  cliente_id: string | null;
  tipo_venta: string;
  total: number;
  observaciones: string | null;
  items: ItemVentaInput[];
  solicitud_rebaja_id?: string;
  credito_autorizado_por?: string | null;
  receta?: RecetaVentaInput | null;
}) {
  try {
    const guard = await requireVentas();
    if (!guard.ok) {
      return {
        success: false,
        error: modalActionMessage(
          guard.code,
          "Error al procesar la venta.",
        ),
      };
    }
    const { supabase, user } = guard;

    const {
      cliente_id,
      tipo_venta,
      observaciones,
      items,
      solicitud_rebaja_id,
      credito_autorizado_por,
      receta,
    } = params;

    if (!items || items.length === 0) {
      throw new Error("La venta debe contener al menos un producto.");
    }

    for (const item of items) {
      if (!item.lote_id) {
        throw new Error("Cada línea de venta debe tener un lote asignado.");
      }
    }

    const tipoCredito = ["crédito", "credito"].includes(
      tipo_venta.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    );

    if (tipoCredito && cliente_id) {
      const resumen = await consultarCreditoVencidoCliente(cliente_id);
      if (resumen.vencido && !credito_autorizado_por) {
        const fecha = resumen.desde
          ? new Date(`${resumen.desde}T12:00:00`).toLocaleDateString("es-GT", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "—";
        throw new Error(
          `Cliente con crédito vencido por Q${resumen.total.toFixed(2)} desde ${fecha}`,
        );
      }
    }

    if (tipoCredito && credito_autorizado_por) {
      const rol = await obtenerRolUsuario(supabase, user.id);
      if (rol !== "admin" && rol !== "super") {
        throw new Error("Solo un administrador puede autorizar crédito con saldo vencido.");
      }
      if (credito_autorizado_por !== user.id) {
        throw new Error("La autorización de crédito debe corresponder al administrador en sesión.");
      }
    }

    const productoIds = [...new Set(items.map((i) => i.producto_id))];
    const { data: comercialesReceta } = await supabase
      .from("v_inv_comerciales")
      .select("producto_id, requiere_receta")
      .in("producto_id", productoIds);

    const requiereReceta = (comercialesReceta ?? []).some((p) =>
      Boolean(p.requiere_receta),
    );

    if (requiereReceta) {
      const medico = receta?.medico_nombre?.trim() ?? "";
      const colegiado = receta?.colegiado?.trim() ?? "";
      if (!medico || !colegiado) {
        throw new Error(
          "Debes registrar el médico y número de colegiado para medicamentos con receta.",
        );
      }
    }

    await assertRebajasAutorizadas(supabase, user.id, {
      cliente_id: cliente_id || null,
      tipo_venta,
      total: params.total,
      observaciones: observaciones || null,
      items,
      solicitud_rebaja_id,
    });

    const pVenta: Record<string, unknown> = {
      cliente_id: cliente_id || null,
      usuario_id: user.id,
      tipo_venta,
      observaciones: observaciones || null,
      solicitud_rebaja_id: solicitud_rebaja_id ?? null,
    };

    if (tipoCredito && credito_autorizado_por) {
      pVenta.credito_autorizado_por = credito_autorizado_por;
    }

    if (requiereReceta && receta) {
      pVenta.receta = {
        medico_nombre: receta.medico_nombre.trim(),
        colegiado: receta.colegiado.trim(),
        numero_receta: receta.numero_receta?.trim() || null,
        fecha_receta: receta.fecha_receta || null,
        observaciones: receta.observaciones?.trim() || null,
      };
    }

    const { data: ventaRpc, error: ventaError } = await supabase.rpc("registrar_venta", {
      p_venta: pVenta,
      p_items: items.map((item) => ({
        producto_id: item.producto_id,
        lote_id: item.lote_id,
        cantidad: item.cantidad,
        precio_aplicado: item.precio_aplicado,
      })),
    });

    if (ventaError) {
      throw new Error(mensajeErrorRegistrarVenta(ventaError.message));
    }

    const ventaRow = ventaRpc as { id?: string; numero_recibo?: number | null } | null;
    if (!ventaRow?.id) {
      throw new Error("No se pudo registrar la venta.");
    }

    const venta = { id: ventaRow.id, numero_recibo: ventaRow.numero_recibo ?? null };

    const productoIdsVendidos = [...new Set(items.map((i) => i.producto_id))];
    const genericosNotificados = new Set<string>();
    for (const productoId of productoIdsVendidos) {
      const { data: comercial } = await supabase
        .from("v_inv_comerciales")
        .select("generico_id, nombre_comercial")
        .eq("producto_id", productoId)
        .maybeSingle();
      const genericoId = comercial?.generico_id as string | undefined;
      if (!genericoId || genericosNotificados.has(genericoId)) continue;

      const { data: generico } = await supabase
        .from("v_inv_genericos")
        .select("generico_nombre, stock_vendible, stock_minimo, bajo_minimo")
        .eq("generico_id", genericoId)
        .maybeSingle();

      if (generico?.bajo_minimo) {
        genericosNotificados.add(genericoId);
        const stock = Number(generico.stock_vendible) || 0;
        const minimo = Number(generico.stock_minimo) || 0;
        await sendPushNotification(
          {
            title: "⚠️ Alerta de Inventario",
            body: `El genérico "${generico.generico_nombre}" está bajo el mínimo (${stock} vendibles, mínimo ${minimo}).`,
            url: "/farmamuni/inventario",
          },
          ["all"],
        );
      }
    }

    // Revalidar rutas para refrescar cache
    revalidatePath("/farmamuni/inventario");
    revalidatePath("/farmamuni/ventas");
    revalidatePath("/farmamuni/finanzas");

    return {
      success: true,
      venta_id: venta.id,
      numero_recibo: venta.numero_recibo,
    };
  } catch (error: any) {
    console.error("Error en crearVenta:", error);
    return {
      success: false,
      error: error.message || "Error desconocido al procesar la venta."
    };
  }
}

async function assertPuedeVerVentaEnHistorial(
  supabase: SupabaseClient,
  userId: string,
  ventaId: string,
  rol: string,
) {
  if (isAdminRole(rol)) return;

  if (rol === "user") {
    const { data, error } = await supabase
      .from("ventas")
      .select("usuario_id")
      .eq("id", ventaId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data || data.usuario_id !== userId) {
      throw new Error("No tienes permiso para ver esta venta.");
    }
    return;
  }

  throw new Error("No tienes permiso para ver el historial de ventas.");
}

// Historial y detalle de ventas
export async function obtenerHistorialVentas() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Sesión no válida o expirada.");
    }

    const rol = await resolveUserRole(supabase, user);
    const puedeHistorial = isAdminRole(rol) || rol === "user";
    if (!puedeHistorial) {
      throw new Error("No tienes permiso para ver el historial de ventas.");
    }

    let ventasQuery = supabase
      .from("ventas")
      .select("*, ven_clientes(nombre, nit)")
      .order("created_at", { ascending: false });

    if (rol === "user") {
      ventasQuery = ventasQuery.eq("usuario_id", user.id);
    }

    const { data, error } = await ventasQuery;

    if (error) throw new Error(error.message);

    const ventas = data || [];
    const usuarioIds = [
      ...new Set(
        ventas
          .flatMap((v) => [v.usuario_id, v.anulada_por])
          .filter(Boolean),
      ),
    ] as string[];

    let perfilesPorId: Record<string, { nombre: string }> = {};

    if (usuarioIds.length > 0) {
      const { data: perfiles, error: perfilesError } = await supabase
        .from("profiles")
        .select("id, nombre")
        .in("id", usuarioIds);

      if (perfilesError) throw new Error(perfilesError.message);

      perfilesPorId = Object.fromEntries(
        (perfiles || []).map((p) => [
          p.id,
          { nombre: p.nombre?.trim() || "Sin nombre" },
        ])
      );
    }

    return ventas.map((venta) => ({
      ...venta,
      profiles: venta.usuario_id ? perfilesPorId[venta.usuario_id] ?? null : null,
      anulada_por_profile: venta.anulada_por
        ? perfilesPorId[venta.anulada_por] ?? null
        : null,
    }));
  } catch (error: unknown) {
    console.error("Error en obtenerHistorialVentas:", error);
    if (error instanceof Error && error.message.includes("permiso")) {
      throw error;
    }
    throw new Error("No se pudo obtener el historial de ventas.");
  }
}

export async function obtenerBitacoraVenta(ventaId: string) {
  try {
    const supabase = await createClient();
    await assertAdminHistorialVentas();

    const { data, error } = await supabase
      .from("ven_ventas_bitacora")
      .select("*")
      .eq("venta_id", ventaId)
      .order("created_at", { ascending: false });

    if (error) {
      const msg = error.message ?? "";
      if (
        msg.includes("ven_ventas_bitacora") &&
        (msg.includes("schema cache") || msg.includes("does not exist"))
      ) {
        return [];
      }
      throw new Error(msg);
    }

    const filas = data || [];
    const usuarioIds = [
      ...new Set(filas.map((f) => f.usuario_id).filter(Boolean)),
    ] as string[];

    let perfilesPorId: Record<string, { nombre: string }> = {};
    if (usuarioIds.length > 0) {
      const { data: perfiles, error: perfilesError } = await supabase
        .from("profiles")
        .select("id, nombre")
        .in("id", usuarioIds);
      if (perfilesError) throw new Error(perfilesError.message);
      perfilesPorId = Object.fromEntries(
        (perfiles || []).map((p) => [
          p.id,
          { nombre: p.nombre?.trim() || "Sin nombre" },
        ]),
      );
    }

    return filas.map((fila) => ({
      ...fila,
      profiles: perfilesPorId[fila.usuario_id] ?? null,
    }));
  } catch (error: unknown) {
    console.error("Error en obtenerBitacoraVenta:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo cargar la bitácora.";
    throw new Error(message);
  }
}

export async function obtenerReporteVentasMes(year: number, month: number) {
  try {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return { success: false as const, error: "Año inválido." };
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return { success: false as const, error: "Mes inválido." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Sesión no válida o expirada." };
    }

    const rol = await obtenerRolUsuario(supabase, user.id);
    if (rol !== "admin" && rol !== "super") {
      return {
        success: false as const,
        error: "No tienes permiso para exportar el reporte de ventas.",
      };
    }

    const { data: perfilReporte } = await supabase
      .from("profiles")
      .select("nombre")
      .eq("id", user.id)
      .maybeSingle();
    const generadoPor =
      perfilReporte?.nombre?.trim() || "Sin nombre";

    const monthStr = String(month).padStart(2, "0");
    const lastDay = ultimoDiaMesCalendario(year, month);
    const mesPrefijo = `${year}-${monthStr}`;
    const desdeIso = `${mesPrefijo}-01T00:00:00.000-06:00`;
    const hastaIso = `${mesPrefijo}-${String(lastDay).padStart(2, "0")}T23:59:59.999-06:00`;

    const ventasRaw = await traerTodo(async (from, to) => {
      const { data, error } = await supabase
        .from("ventas")
        .select("*, ven_clientes(nombre, nit)")
        .gte("created_at", desdeIso)
        .lte("created_at", hastaIso)
        .order("created_at", { ascending: true })
        .range(from, to);
      return { data, error };
    });

    const ventas = ventasRaw.filter((v) =>
      fechaVentaCalendarioGt(v.created_at).startsWith(mesPrefijo),
    );

    const ventaIds = ventas.map((v) => v.id);
    const anulacionesPorVentaId: Record<string, { autor: string; motivo: string }> =
      {};

    if (ventaIds.length > 0) {
      const { data: bitacoras, error: bitError } = await supabase
        .from("ven_ventas_bitacora")
        .select("*")
        .eq("accion", "anular")
        .in("venta_id", ventaIds);

      if (bitError) {
        const msg = bitError.message ?? "";
        if (
          !(
            msg.includes("ven_ventas_bitacora") &&
            (msg.includes("schema cache") || msg.includes("does not exist"))
          )
        ) {
          return { success: false as const, error: msg };
        }
      } else {
        const filas = bitacoras || [];
        const usuarioIds = [
          ...new Set(filas.map((f) => f.usuario_id).filter(Boolean)),
        ] as string[];

        let perfilesPorId: Record<string, { nombre: string }> = {};
        if (usuarioIds.length > 0) {
          const { data: perfiles, error: perfilesError } = await supabase
            .from("profiles")
            .select("id, nombre")
            .in("id", usuarioIds);
          if (perfilesError) {
            return { success: false as const, error: perfilesError.message };
          }
          perfilesPorId = Object.fromEntries(
            (perfiles || []).map((p) => [
              p.id,
              { nombre: p.nombre?.trim() || "Sin nombre" },
            ]),
          );
        }

        const filasOrdenadas = [...filas].sort((a, b) =>
          String(b.created_at).localeCompare(String(a.created_at)),
        );
        for (const fila of filasOrdenadas) {
          if (anulacionesPorVentaId[fila.venta_id]) continue;
          const autor =
            perfilesPorId[fila.usuario_id]?.nombre?.trim() || "Sin nombre";
          const motivo =
            typeof fila.motivo === "string" ? fila.motivo.trim() : "";
          anulacionesPorVentaId[fila.venta_id] = {
            autor,
            motivo: motivo || "—",
          };
        }
      }
    }

    const activasIds = ventas
      .filter((v) => !ventaEstaAnulada(v))
      .map((v) => v.id);

    const usuarioIdsVentas = [
      ...new Set(
        ventas.map((v) => v.usuario_id).filter(Boolean),
      ),
    ] as string[];

    let nombresVendedorPorId: Record<string, string> = {};
    if (usuarioIdsVentas.length > 0) {
      const { data: perfilesV, error: perfilesVError } = await supabase
        .from("profiles")
        .select("id, nombre")
        .in("id", usuarioIdsVentas);
      if (perfilesVError) {
        return { success: false as const, error: perfilesVError.message };
      }
      nombresVendedorPorId = Object.fromEntries(
        (perfilesV ?? []).map((p) => [
          p.id,
          p.nombre?.trim() || "Sin nombre",
        ]),
      );
    }

    let detalles: import("./reporte-ventas-mes").DetalleReporteMesInput[] = [];

    if (activasIds.length > 0) {
      type FilaDetalleRaw = {
        venta_id: string;
        cantidad: number;
        subtotal: number;
        inv_lotes:
          | { precio_costo: number | null }
          | { precio_costo: number | null }[]
          | null;
        inv_productos:
          | {
              nombre: string;
              inv_genericos: {
                concentracion: string;
                forma_farmaceutica: string;
                inv_catalogos: { nombre: string } | null;
              } | null;
            }
          | {
              nombre: string;
              inv_genericos: {
                concentracion: string;
                forma_farmaceutica: string;
                inv_catalogos: { nombre: string } | null;
              } | null;
            }[]
          | null;
      };

      const detRaw: FilaDetalleRaw[] = [];
      for (const loteIds of enLotes(activasIds)) {
        const parte = await traerTodo(async (from, to) => {
          const { data, error } = await supabase
            .from("ven_detalles")
            .select(
              "venta_id, cantidad, subtotal, inv_lotes(precio_costo), inv_productos(nombre, inv_genericos(concentracion, forma_farmaceutica, inv_catalogos(nombre)))",
            )
            .in("venta_id", loteIds)
            .range(from, to);
          return { data, error };
        });
        detRaw.push(...(parte as unknown as FilaDetalleRaw[]));
      }

      detalles = detRaw.map((row) => {
        const prodRaw = row.inv_productos;
        const prod = Array.isArray(prodRaw) ? prodRaw[0] : prodRaw;
        const marca = prod?.nombre?.trim() || "Producto";
        const gen = prod?.inv_genericos;
        const catalogo = gen?.inv_catalogos?.nombre?.trim() || marca;
        const producto = gen
          ? lineaGenericaCompraDisplay({
              catalogo_nombre: catalogo,
              concentracion: gen.concentracion ?? "",
              forma_farmaceutica: gen.forma_farmaceutica ?? "",
            })
          : marca;
        const loteRaw = row.inv_lotes;
        const lote = Array.isArray(loteRaw) ? loteRaw[0] : loteRaw;
        const costoUnit = Number(lote?.precio_costo) || 0;
        const cantidad = Number(row.cantidad) || 0;
        const subtotal = Number(row.subtotal) || 0;
        return {
          venta_id: row.venta_id,
          cantidad,
          subtotal,
          producto,
          marca,
          costo: Math.round(costoUnit * cantidad * 100) / 100,
        };
      });
    }

    const reporte: ReporteVentasMes = {
      ...construirReporteVentasMes(
        ventas,
        anulacionesPorVentaId,
        detalles,
        nombresVendedorPorId,
        year,
        month,
      ),
      generadoPor,
    };

    return { success: true as const, data: reporte };
  } catch (error: unknown) {
    console.error("Error en obtenerReporteVentasMes:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo generar el reporte de ventas.";
    return { success: false as const, error: message };
  }
}

export type VentaRecetaReporteRow = {
  recibo: string;
  fecha: string;
  cliente: string;
  medico: string;
  colegiado: string;
  numero_receta: string;
  producto: string;
  marca: string;
  lote: string;
  cantidad: number;
};

export type TotalesRecetaProductoRow = {
  producto: string;
  marca: string;
  cantidad: number;
};

export async function obtenerReporteVentasReceta(
  fechaDesde: string,
  fechaHasta: string,
) {
  try {
    if (!fechaDesde || !fechaHasta) {
      return { success: false as const, error: "Indica el rango de fechas." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Sesión no válida o expirada." };
    }

    const rol = await obtenerRolUsuario(supabase, user.id);
    if (rol !== "admin" && rol !== "super") {
      return {
        success: false as const,
        error: "No tienes permiso para exportar este reporte.",
      };
    }

    const { data: perfilReporte } = await supabase
      .from("profiles")
      .select("nombre")
      .eq("id", user.id)
      .maybeSingle();
    const generadoPor = perfilReporte?.nombre?.trim() || "Sin nombre";

    const desdeIso = `${fechaDesde}T00:00:00.000-06:00`;
    const hastaIso = `${fechaHasta}T23:59:59.999-06:00`;

    const ventasReceta = await traerTodo(async (from, to) => {
      const { data, error } = await supabase
        .from("ventas")
        .select(
          "id, created_at, numero_recibo, ven_clientes(nombre), ven_recetas!inner(medico_nombre, colegiado, numero_receta)",
        )
        .gte("created_at", desdeIso)
        .lte("created_at", hastaIso)
        .order("created_at", { ascending: true })
        .range(from, to);
      return { data, error };
    });

    const ventaIds = ventasReceta.map((v) => v.id as string);
    const filas: VentaRecetaReporteRow[] = [];

    if (ventaIds.length > 0) {
      type FilaDetReceta = {
        venta_id: string;
        cantidad: number;
        inv_lotes:
          | { numero_lote: string | null }
          | { numero_lote: string | null }[]
          | null;
        inv_productos:
          | {
              nombre: string;
              inv_genericos: { requiere_receta: boolean; concentracion: string; forma_farmaceutica: string; inv_catalogos: { nombre: string } | null } | null;
            }
          | {
              nombre: string;
              inv_genericos: { requiere_receta: boolean; concentracion: string; forma_farmaceutica: string; inv_catalogos: { nombre: string } | null } | null;
            }[]
          | null;
      };

      const detallesRaw: FilaDetReceta[] = [];
      for (const loteIds of enLotes(ventaIds)) {
        const parte = await traerTodo(async (from, to) => {
          const { data, error } = await supabase
            .from("ven_detalles")
            .select(
              "venta_id, cantidad, inv_lotes(numero_lote), inv_productos(nombre, inv_genericos(requiere_receta, concentracion, forma_farmaceutica, inv_catalogos(nombre)))",
            )
            .in("venta_id", loteIds)
            .range(from, to);
          return { data, error };
        });
        detallesRaw.push(...(parte as unknown as FilaDetReceta[]));
      }

      const ventaPorId = new Map(
        ventasReceta.map((v) => [v.id as string, v]),
      );

      for (const row of detallesRaw) {
        const prodRaw = row.inv_productos;
        const prod = Array.isArray(prodRaw) ? prodRaw[0] : prodRaw;
        if (!prod?.inv_genericos?.requiere_receta) continue;

        const venta = ventaPorId.get(row.venta_id);
        if (!venta) continue;

        const recetaRow = Array.isArray(venta.ven_recetas)
          ? venta.ven_recetas[0]
          : venta.ven_recetas;
        const clientes = venta.ven_clientes as
          | { nombre: string }
          | { nombre: string }[]
          | null;
        const clienteNombre = Array.isArray(clientes)
          ? clientes[0]?.nombre
          : clientes?.nombre;
        const loteRaw = row.inv_lotes;
        const lote = Array.isArray(loteRaw) ? loteRaw[0] : loteRaw;
        const catalogo =
          prod.inv_genericos.inv_catalogos?.nombre?.trim() ||
          prod.nombre;
        const producto = lineaGenericaCompraDisplay({
          catalogo_nombre: catalogo,
          concentracion: prod.inv_genericos.concentracion ?? "",
          forma_farmaceutica: prod.inv_genericos.forma_farmaceutica ?? "",
        });

        filas.push({
          recibo: codigoReciboVenta({
            id: venta.id as string,
            numero_recibo: venta.numero_recibo as number | null,
          }),
          fecha: venta.created_at as string,
          cliente: clienteNombre?.trim() || ETIQUETA_CONSUMIDOR_FINAL,
          medico: (recetaRow as { medico_nombre: string }).medico_nombre,
          colegiado: (recetaRow as { colegiado: string }).colegiado,
          numero_receta:
            (recetaRow as { numero_receta?: string | null }).numero_receta?.trim() ||
            "—",
          producto,
          marca: prod.nombre?.trim() || "—",
          lote: lote?.numero_lote?.trim() || "—",
          cantidad: Number(row.cantidad) || 0,
        });
      }

      filas.sort((a, b) => a.fecha.localeCompare(b.fecha));
    }

    const totalesPorProductoMap = new Map<string, TotalesRecetaProductoRow>();
    for (const f of filas) {
      const key = `${f.marca}\0${f.producto}`;
      const prev = totalesPorProductoMap.get(key);
      if (prev) {
        prev.cantidad += f.cantidad;
      } else {
        totalesPorProductoMap.set(key, {
          producto: f.producto,
          marca: f.marca,
          cantidad: f.cantidad,
        });
      }
    }
    const totalesPorProducto = [...totalesPorProductoMap.values()].sort(
      (a, b) => b.cantidad - a.cantidad,
    );

    return {
      success: true as const,
      data: {
        fechaDesde,
        fechaHasta,
        generadoPor,
        filas,
        totalesPorProducto,
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo generar el reporte de ventas con receta.";
    return { success: false as const, error: message };
  }
}

export async function obtenerVendedoresCorteCaja() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Sesión no válida.", vendedores: [] };
    }

    const rol = await resolveUserRole(supabase, user);
    if (!isAdminRole(rol)) {
      return { success: true as const, vendedores: [] };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, nombre")
      .in("rol", ["user", "admin", "super"])
      .order("nombre", { ascending: true });

    if (error) {
      return { success: false as const, error: error.message, vendedores: [] };
    }

    return {
      success: true as const,
      vendedores: (data ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre?.trim() || "Sin nombre",
      })),
    };
  } catch {
    return {
      success: false as const,
      error: "No se pudieron cargar los vendedores.",
      vendedores: [],
    };
  }
}

function fechaMovimientoCalendarioGt(fechaMovimiento: string): string {
  return fechaCalendarioGt(new Date(fechaMovimiento));
}

export async function obtenerCorteCajaDiario(
  fecha: string,
  usuarioFiltroId: string | null,
) {
  try {
    const fechaNorm = fecha.trim();
    if (!fechaNorm) {
      return { success: false as const, error: "Indica la fecha del corte." };
    }

    const inicio = inicioTimestamptzDiaGt(fechaNorm);
    const fin = finTimestamptzDiaGt(fechaNorm);
    if (!inicio || !fin) {
      return { success: false as const, error: "Fecha inválida." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Sesión no válida o expirada." };
    }

    const rol = await resolveUserRole(supabase, user);
    const puedeHistorial = isAdminRole(rol) || rol === "user";
    if (!puedeHistorial) {
      return {
        success: false as const,
        error: "No tienes permiso para el corte de caja.",
      };
    }

    let usuarioIdConsulta: string | null = null;
    if (isAdminRole(rol)) {
      usuarioIdConsulta =
        usuarioFiltroId && usuarioFiltroId.trim() !== ""
          ? usuarioFiltroId.trim()
          : null;
    } else {
      usuarioIdConsulta = user.id;
    }

    const { data: perfilReporte } = await supabase
      .from("profiles")
      .select("nombre")
      .eq("id", user.id)
      .maybeSingle();
    const generadoPor = perfilReporte?.nombre?.trim() || "Sin nombre";

    let etiquetaVendedor = "Todos los vendedores";
    if (usuarioIdConsulta) {
      const { data: perfilV } = await supabase
        .from("profiles")
        .select("nombre")
        .eq("id", usuarioIdConsulta)
        .maybeSingle();
      etiquetaVendedor = perfilV?.nombre?.trim() || "Sin nombre";
    }

    const ventasRaw = await traerTodo(async (from, to) => {
      let q = supabase
        .from("ventas")
        .select("*, ven_clientes(nombre, nit)")
        .gte("created_at", inicio)
        .lte("created_at", fin)
        .order("created_at", { ascending: true })
        .range(from, to);
      if (usuarioIdConsulta) {
        q = q.eq("usuario_id", usuarioIdConsulta);
      }
      const { data, error } = await q;
      return { data, error };
    });

    const ventas = ventasRaw.filter(
      (v) => fechaVentaCalendarioGt(v.created_at as string) === fechaNorm,
    );

    const ventaIds = ventas.map((v) => v.id as string);
    const anulacionesBitacora: {
      venta_id: string;
      usuario_id: string;
      motivo: string;
      created_at: string;
    }[] = [];

    const bitacorasDia = await traerTodo(async (from, to) => {
      const { data, error } = await supabase
        .from("ven_ventas_bitacora")
        .select("venta_id, usuario_id, motivo, created_at, accion")
        .eq("accion", "anular")
        .gte("created_at", inicio)
        .lte("created_at", fin)
        .order("created_at", { ascending: true })
        .range(from, to);
      return { data, error };
    });

    for (const b of bitacorasDia) {
      if (fechaVentaCalendarioGt(b.created_at as string) !== fechaNorm) continue;
      anulacionesBitacora.push({
        venta_id: b.venta_id as string,
        usuario_id: b.usuario_id as string,
        motivo: typeof b.motivo === "string" ? b.motivo : "",
        created_at: b.created_at as string,
      });
    }

    const ventaIdsAnuladas = [
      ...new Set(anulacionesBitacora.map((b) => b.venta_id)),
    ];
    const ventasAnuladasExtra = ventaIdsAnuladas.filter(
      (id) => !ventaIds.includes(id),
    );

    let ventasAnuladasLookup = [...ventas];
    if (ventasAnuladasExtra.length > 0) {
      for (const loteIds of enLotes(ventasAnuladasExtra)) {
        const { data: extra, error: extraError } = await supabase
          .from("ventas")
          .select("*, ven_clientes(nombre, nit)")
          .in("id", loteIds);
        if (extraError) {
          return { success: false as const, error: extraError.message };
        }
        ventasAnuladasLookup.push(...(extra ?? []));
      }
    }

    const usuarioIdsBitacora = [
      ...new Set(anulacionesBitacora.map((b) => b.usuario_id)),
    ];
    let perfilesBitacora: Record<string, string> = {};
    if (usuarioIdsBitacora.length > 0) {
      const { data: perfiles, error: perfilesError } = await supabase
        .from("profiles")
        .select("id, nombre")
        .in("id", usuarioIdsBitacora);
      if (perfilesError) {
        return { success: false as const, error: perfilesError.message };
      }
      perfilesBitacora = Object.fromEntries(
        (perfiles ?? []).map((p) => [
          p.id,
          p.nombre?.trim() || "Sin nombre",
        ]),
      );
    }

    const abonosRaw = await traerTodo(async (from, to) => {
      let q = supabase
        .from("fin_transacciones")
        .select("id, monto, fecha_movimiento, usuario_id, descripcion, venta_id")
        .eq("categoria", "abono_cliente")
        .eq("tipo_movimiento", "ingreso")
        .gte("fecha_movimiento", inicio)
        .lte("fecha_movimiento", fin)
        .order("fecha_movimiento", { ascending: true })
        .range(from, to);
      if (usuarioIdConsulta) {
        q = q.eq("usuario_id", usuarioIdConsulta);
      }
      const { data, error } = await q;
      return { data, error };
    });

    const abonos = abonosRaw
      .filter(
        (a) =>
          fechaMovimientoCalendarioGt(a.fecha_movimiento as string) ===
          fechaNorm,
      )
      .map((a) => ({
        monto: Number(a.monto) || 0,
        fecha_movimiento: a.fecha_movimiento as string,
        descripcion: (a.descripcion as string | null) ?? "",
      }));

    const reporte: ReporteCorteCaja = {
      ...construirReporteCorteCaja({
        fecha: fechaNorm,
        etiquetaVendedor,
        ventas: ventas.map((v) => ({
          id: v.id as string,
          created_at: v.created_at as string,
          numero_recibo: v.numero_recibo as number | null,
          tipo_venta: v.tipo_venta as string | null,
          total: v.total as number | string | null,
          observaciones: v.observaciones as string | null,
          anulada: v.anulada as boolean | null,
          estado: v.estado as string | null,
          ven_clientes: v.ven_clientes as { nombre: string } | null,
        })),
        anulacionesDia: anulacionesBitacora
          .filter((b) => {
            if (!usuarioIdConsulta) return true;
            const venta = ventasAnuladasLookup.find((v) => v.id === b.venta_id);
            return venta?.usuario_id === usuarioIdConsulta;
          })
          .map((b) => {
          const venta = ventasAnuladasLookup.find((v) => v.id === b.venta_id);
          return {
            recibo: venta
              ? codigoReciboVenta({
                  id: venta.id as string,
                  numero_recibo: venta.numero_recibo as number | null,
                })
              : b.venta_id.slice(0, 8),
            monto: Number(venta?.total) || 0,
            autor: perfilesBitacora[b.usuario_id] ?? "Sin nombre",
            motivo: b.motivo.trim() || "—",
          };
        }),
        abonos,
      }),
      generadoPor,
    };

    return { success: true as const, data: reporte };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo generar el corte de caja.";
    return { success: false as const, error: message };
  }
}

export async function obtenerDetalleVenta(ventaId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Sesión no válida o expirada.");
    }

    const rol = await resolveUserRole(supabase, user);
    await assertPuedeVerVentaEnHistorial(supabase, user.id, ventaId, rol);

    const { data, error } = await supabase
      .from("ven_detalles")
      .select(
        "*, inv_lotes(codigo_barras, numero_lote, precio_costo), inv_productos(nombre, presentacion, generico_id, laboratorio_id, inv_genericos(concentracion, forma_farmaceutica, inv_catalogos(nombre)), inv_laboratorios(nombre))",
      )
      .eq("venta_id", ventaId);

    if (error) throw new Error(error.message);

    return data || [];
  } catch (error: any) {
    console.error("Error en obtenerDetalleVenta:", error);
    throw new Error("No se pudo obtener el detalle de la venta.");
  }
}

function mensajeErrorRpcAnularVenta(message: string): string {
  const m = message.toUpperCase();
  if (m.includes("FORBIDDEN")) {
    return "No tienes permiso para anular ventas.";
  }
  if (m.includes("MOTIVO_REQUERIDO")) {
    return "El motivo de anulación es obligatorio (mínimo 5 caracteres).";
  }
  if (m.includes("NO_ENCONTRADA")) {
    return "No se encontró la venta.";
  }
  if (m.includes("YA_ANULADA")) {
    return "Esta venta ya está anulada.";
  }
  return message || "No se pudo anular la venta.";
}

// Anular venta
export async function anularVenta(ventaId: string, motivo: string) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return {
        success: false,
        error: modalActionMessage(guard.code, "Error al anular la venta."),
      };
    }
    const { supabase, user } = guard;
    const motivoLimpio = parseMotivoModificacionVenta(motivo);

    const { error: rpcError } = await supabase.rpc("anular_venta", {
      p_venta_id: ventaId,
      p_motivo: motivoLimpio,
    });

    if (rpcError) {
      return {
        success: false,
        error: mensajeErrorRpcAnularVenta(rpcError.message),
      };
    }

    await registrarBitacoraVenta(supabase, {
      ventaId,
      usuarioId: user.id,
      accion: "anular",
      motivo: motivoLimpio,
    });

    revalidatePath("/farmamuni/inventario");
    revalidatePath("/farmamuni/ventas");
    revalidatePath("/farmamuni/finanzas");
    revalidatePath("/farmamuni/creditos");

    return { success: true };
  } catch (error: unknown) {
    console.error("Error en anularVenta:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al anular la venta.",
    };
  }
}

const ERROR_CORREGIR_VENTA_HISTORIAL =
  "Para corregir una venta, anúlala y regístrala de nuevo.";

// Corregir líneas del historial (deshabilitado)
export async function editarDetalleVentaDirecto(_params: {
  detalleId: string;
  ventaId: string;
  productoId: string;
  nuevaCantidad: number;
  nuevoPrecio: number;
  motivo: string;
  productoNombre?: string;
}) {
  return { success: false, error: ERROR_CORREGIR_VENTA_HISTORIAL };
}

export async function eliminarDetalleVentaDirecto(_params: {
  detalleId: string;
  ventaId: string;
  productoId: string;
  cantidadADevolver: number;
  motivo: string;
  productoNombre?: string;
}) {
  return { success: false, error: ERROR_CORREGIR_VENTA_HISTORIAL };
}

const VENTAS_SIN_PERMISO = "Sin permiso para realizar esta acción.";
const CREDENCIALES_ADMIN_INCORRECTAS = "Credenciales incorrectas.";

async function verificarCredencialesAdminConLimite(
  callerUserId: string,
  username: string,
  clave: string,
): Promise<
  | { ok: true; adminUserId: string }
  | { ok: false; error: string }
> {
  if (isAdminCredentialRateLimited(callerUserId)) {
    return { ok: false, error: "Demasiados intentos. Espera unos minutos." };
  }

  const usuario = username.trim();
  if (!usuario || !clave) {
    return { ok: false, error: "Usuario y contraseña son obligatorios." };
  }

  const email = usuario.includes("@") ? usuario : `${usuario}@app.com`;
  const supabaseTemp = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const { data: authData, error: authError } =
    await supabaseTemp.auth.signInWithPassword({
      email,
      password: clave,
    });

  if (authError || !authData.user) {
    recordAdminCredentialFailure(callerUserId);
    return { ok: false, error: CREDENCIALES_ADMIN_INCORRECTAS };
  }

  const rol = await resolveUserRole(supabaseTemp, authData.user);
  if (!isAdminRole(rol)) {
    recordAdminCredentialFailure(callerUserId);
    return { ok: false, error: CREDENCIALES_ADMIN_INCORRECTAS };
  }

  clearAdminCredentialFailures(callerUserId);
  return { ok: true, adminUserId: authData.user.id };
}

// Rebajas y autorización de admin
export async function autorizarRebajaConCredencialesAdmin(
  solicitudId: string,
  username: string,
  clave: string,
) {
  try {
    const guard = await requireVentas();
    if (!guard.ok) {
      return { success: false as const, error: VENTAS_SIN_PERMISO };
    }

    const credenciales = await verificarCredencialesAdminConLimite(
      guard.user.id,
      username,
      clave,
    );
    if (!credenciales.ok) {
      return { success: false as const, error: credenciales.error };
    }

    const admin = createAdminClient();
    const { data: solicitud, error: fetchError } = await admin
      .from("ven_solicitudes_rebaja")
      .select("id, solicitante_id, estado")
      .eq("id", solicitudId)
      .maybeSingle();

    if (fetchError || !solicitud) {
      return { success: false as const, error: "Solicitud no encontrada." };
    }
    if (solicitud.estado !== "pendiente") {
      return { success: false as const, error: "Esta solicitud ya fue resuelta." };
    }

    const { error: updateError } = await admin
      .from("ven_solicitudes_rebaja")
      .update({
        estado: "aprobada",
        resuelto_por: credenciales.adminUserId,
        resuelto_at: new Date().toISOString(),
      })
      .eq("id", solicitudId);

    if (updateError) {
      return { success: false as const, error: updateError.message };
    }

    await sendPushToUsers([solicitud.solicitante_id], {
      title: "Rebaja autorizada",
      body: "Un administrador confirmó los precios. Ya puedes cobrar de nuevo.",
      url: "/farmamuni/ventas",
    });

    revalidatePath("/farmamuni/ventas");
    return { success: true as const };
  } catch {
    return {
      success: false as const,
      error: "No se pudo autorizar la rebaja.",
    };
  }
}

export async function crearSolicitudRebaja(payload: unknown) {
  try {
    const parsed = CrearSolicitudRebajaSchema.safeParse({ payload });
    if (!parsed.success) {
      return { success: false as const, error: "Datos de solicitud inválidos." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Sesión no válida o expirada." };
    }

    const tieneRebaja = parsed.data.payload.items.some((i) =>
      esRebajaDePrecio(i.precio_aplicado, precioReferenciaRebajaPayload(i)),
    );
    if (!tieneRebaja) {
      return {
        success: false as const,
        error: "No hay rebajas de precio en esta venta.",
      };
    }

    const supabaseRead = await createClient();
    for (const item of parsed.data.payload.items) {
      const { data: prod } = await supabaseRead
        .from("inv_productos")
        .select("nombre")
        .eq("id", item.producto_id)
        .maybeSingle();
      const costo = await obtenerCostoReferenciaVenta(
        supabaseRead,
        item.producto_id,
        item.lote_id,
      );
      if (precioMenorQueCosto(item.precio_aplicado, costo)) {
        return {
          success: false as const,
          error: `El precio de "${prod?.nombre ?? "producto"}" no puede ser menor al costo promedio (Q${costo.toFixed(2)}).`,
        };
      }
    }

    const admin = createAdminClient();
    await admin
      .from("ven_solicitudes_rebaja")
      .update({ estado: "expirada" })
      .eq("solicitante_id", user.id)
      .eq("estado", "pendiente");

    const { data: row, error: insertError } = await supabase
      .from("ven_solicitudes_rebaja")
      .insert({
        solicitante_id: user.id,
        estado: "pendiente",
        payload: parsed.data.payload,
      })
      .select("id, created_at")
      .single();

    if (insertError || !row) {
      const msg = insertError?.message ?? "";
      if (msg.includes("ven_solicitudes_rebaja") || insertError?.code === "42P01") {
        return {
          success: false as const,
          error:
            "Falta la tabla de autorización de rebajas. Ejecuta la migración en Supabase.",
        };
      }
      return {
        success: false as const,
        error: insertError?.message ?? "No se pudo crear la solicitud.",
      };
    }

    const { data: perfil } = await supabase
      .from("profiles")
      .select("nombre")
      .eq("id", user.id)
      .maybeSingle();
    const nombreVendedor = perfil?.nombre?.trim() || "Un vendedor";
    const totalFmt = parsed.data.payload.total.toFixed(2);

    await sendPushToRoles(["admin", "super"], {
      title: "Rebaja pendiente de confirmar",
      body: `${nombreVendedor} solicita autorizar precios (Q${totalFmt}).`,
      url: `/farmamuni/ventas?autorizarRebaja=${row.id}`,
    });

    revalidatePath("/farmamuni/ventas");

    return { success: true as const, solicitud_id: row.id };
  } catch (error: unknown) {
    console.error("Error en crearSolicitudRebaja:", error);
    return {
      success: false as const,
      error: "No se pudo enviar la solicitud de autorización.",
    };
  }
}

export async function obtenerSolicitudRebaja(solicitudId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Sesión no válida." };
    }

    const { data, error } = await supabase
      .from("ven_solicitudes_rebaja")
      .select(
        "id, solicitante_id, estado, payload, venta_id, resuelto_por, resuelto_at, motivo_rechazo, created_at",
      )
      .eq("id", solicitudId)
      .maybeSingle();

    if (error || !data) {
      return { success: false as const, error: "Solicitud no encontrada." };
    }

    const rol = await obtenerRolUsuario(supabase, user.id);
    const esAdmin = rol === "admin" || rol === "super";
    if (data.solicitante_id !== user.id && !esAdmin) {
      return { success: false as const, error: "No autorizado." };
    }

    return { success: true as const, solicitud: data };
  } catch {
    return { success: false as const, error: "Error al consultar la solicitud." };
  }
}

export async function obtenerMiSolicitudRebajaPendiente() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Sesión no válida.", solicitud: null };
    }

    const { data, error } = await supabase
      .from("ven_solicitudes_rebaja")
      .select("id, solicitante_id, estado, payload, created_at")
      .eq("solicitante_id", user.id)
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === "42P01") {
        return { success: true as const, solicitud: null };
      }
      return { success: false as const, error: error.message, solicitud: null };
    }

    return { success: true as const, solicitud: data };
  } catch {
    return {
      success: false as const,
      error: "Error al consultar tu solicitud.",
      solicitud: null,
    };
  }
}

export async function listarSolicitudesRebajaPendientes() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Sesión no válida.", solicitudes: [] };
    }

    const rol = await obtenerRolUsuario(supabase, user.id);
    if (rol !== "admin" && rol !== "super") {
      return { success: true as const, solicitudes: [] };
    }

    const { data, error } = await supabase
      .from("ven_solicitudes_rebaja")
      .select("id, solicitante_id, estado, payload, created_at")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true });

    if (error) {
      if (error.code === "42P01") {
        return { success: true as const, solicitudes: [] };
      }
      return {
        success: false as const,
        error: error.message,
        solicitudes: [],
      };
    }

    return { success: true as const, solicitudes: data ?? [] };
  } catch {
    return {
      success: false as const,
      error: "Error al listar solicitudes.",
      solicitudes: [],
    };
  }
}

export async function aprobarSolicitudRebaja(solicitudId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Sesión no válida." };
    }

    const rol = await obtenerRolUsuario(supabase, user.id);
    if (rol !== "admin" && rol !== "super") {
      return { success: false as const, error: "Sin permisos de administrador." };
    }

    const admin = createAdminClient();
    const { data: solicitud, error: fetchError } = await admin
      .from("ven_solicitudes_rebaja")
      .select("id, solicitante_id, estado")
      .eq("id", solicitudId)
      .maybeSingle();

    if (fetchError || !solicitud) {
      return { success: false as const, error: "Solicitud no encontrada." };
    }
    if (solicitud.estado !== "pendiente") {
      return { success: false as const, error: "La solicitud ya fue resuelta." };
    }

    const { error: updateError } = await admin
      .from("ven_solicitudes_rebaja")
      .update({
        estado: "aprobada",
        resuelto_por: user.id,
        resuelto_at: new Date().toISOString(),
      })
      .eq("id", solicitudId);

    if (updateError) {
      return { success: false as const, error: updateError.message };
    }

    await sendPushToUsers([solicitud.solicitante_id], {
      title: "Rebaja autorizada",
      body: "Un administrador aprobó los precios. Ya puedes continuar el cobro.",
      url: "/farmamuni/ventas",
    });

    revalidatePath("/farmamuni/ventas");

    return { success: true as const };
  } catch {
    return { success: false as const, error: "No se pudo aprobar la solicitud." };
  }
}

export async function rechazarSolicitudRebaja(
  solicitudId: string,
  motivo?: string | null,
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Sesión no válida." };
    }

    const rol = await obtenerRolUsuario(supabase, user.id);
    if (rol !== "admin" && rol !== "super") {
      return { success: false as const, error: "Sin permisos de administrador." };
    }

    const admin = createAdminClient();
    const { data: solicitud, error: fetchError } = await admin
      .from("ven_solicitudes_rebaja")
      .select("id, solicitante_id, estado")
      .eq("id", solicitudId)
      .maybeSingle();

    if (fetchError || !solicitud) {
      return { success: false as const, error: "Solicitud no encontrada." };
    }
    if (solicitud.estado !== "pendiente") {
      return { success: false as const, error: "La solicitud ya fue resuelta." };
    }

    const motivoLimpio = motivo?.trim() || null;

    const { error: updateError } = await admin
      .from("ven_solicitudes_rebaja")
      .update({
        estado: "rechazada",
        resuelto_por: user.id,
        resuelto_at: new Date().toISOString(),
        motivo_rechazo: motivoLimpio,
      })
      .eq("id", solicitudId);

    if (updateError) {
      return { success: false as const, error: updateError.message };
    }

    await sendPushToUsers([solicitud.solicitante_id], {
      title: "Rebaja rechazada",
      body: motivoLimpio
        ? motivoLimpio
        : "Un administrador rechazó los precios modificados.",
      url: "/farmamuni/ventas",
    });

    revalidatePath("/farmamuni/ventas");

    return { success: true as const };
  } catch {
    return { success: false as const, error: "No se pudo rechazar la solicitud." };
  }
}

export async function validarCredencialesAdmin(username: string, clave: string) {
  try {
    const guard = await requireVentas();
    if (!guard.ok) {
      return { success: false, error: VENTAS_SIN_PERMISO };
    }

    const credenciales = await verificarCredencialesAdminConLimite(
      guard.user.id,
      username,
      clave,
    );
    if (!credenciales.ok) {
      return { success: false, error: credenciales.error };
    }

    return { success: true };
  } catch {
    return { success: false, error: CREDENCIALES_ADMIN_INCORRECTAS };
  }
}
