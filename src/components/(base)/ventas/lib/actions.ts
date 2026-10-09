"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  CrearSolicitudRebajaSchema,
  Producto,
  Cliente,
  SolicitudRebajaPayloadSchema,
  MotivoModificacionVentaSchema,
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
} from "./helpers";
import { formatFechaHoraGt } from "@/lib/fechas-gt";
import { fmtQ } from "@/lib/utils";
import {
  construirReporteVentasMes,
  type ReporteVentasMes,
} from "./reporte-ventas-mes";
import { ultimoDiaMesCalendario } from "@/lib/fechas-gt";
import { ajustarStockPorVenta, obtenerCostoProductoOLote } from "./lotes-stock";
import {
  asignarCantidadFefo,
  filtrarLotesVendiblesFefo,
  loteVendiblePorFecha,
  precioVentaDeLote,
  type LoteAsignadoVenta,
  type LoteVendibleRow,
} from "./lotes-venta";
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
    return "Hay un precio por debajo del costo del lote. Solo un administrador puede autorizar esta venta.";
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

// Productos y clientes para vender
export async function obtenerProductosYClientes() {
  try {
    const supabase = await createClient();

    // Obtener productos activos
    const { data: productos, error: prodError } = await supabase
      .from("inv_productos")
      .select("*")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (prodError) throw new Error(prodError.message);

    const { data: lotesRaw, error: lotesError } = await supabase
      .from("inv_lotes")
      .select(
        "producto_id, id, codigo_barras, cantidad_actual, precio_venta, precio_costo, laboratorio, fecha_vencimiento, created_at, ubicacion",
      )
      .eq("activo", true)
      .gt("cantidad_actual", 0)
      .order("fecha_vencimiento", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (lotesError) throw new Error(lotesError.message);

    const lotesPorProducto = new Map<string, LoteVendibleRow[]>();
    for (const row of lotesRaw ?? []) {
      const lote: LoteVendibleRow = {
        id: row.id as string,
        codigo_barras: row.codigo_barras as string,
        cantidad_actual: Number(row.cantidad_actual) || 0,
        precio_costo: Number(row.precio_costo) || 0,
        precio_venta: row.precio_venta != null ? Number(row.precio_venta) : null,
        laboratorio: (row.laboratorio as string | null) ?? null,
        fecha_vencimiento: (row.fecha_vencimiento as string | null) ?? null,
        created_at: (row.created_at as string | null) ?? null,
        ubicacion: (row.ubicacion as string | null) ?? null,
      };
      if (!loteVendiblePorFecha(lote.fecha_vencimiento)) continue;
      const pid = row.producto_id as string;
      const list = lotesPorProducto.get(pid) ?? [];
      list.push(lote);
      lotesPorProducto.set(pid, list);
    }

    const productosPos = (productos ?? []).map((prod) => {
      const lotes = lotesPorProducto.get(prod.id as string) ?? [];
      const precios = lotes.map((l) =>
        precioVentaDeLote(l.precio_venta, Number(prod.precio_base) || 0),
      );
      const fefo = lotes[0];
      const precioFefo = fefo
        ? precioVentaDeLote(fefo.precio_venta, Number(prod.precio_base) || 0)
        : Number(prod.precio_base) || 0;
      const minPrecio = precios.length > 0 ? Math.min(...precios) : precioFefo;
      const maxPrecio = precios.length > 0 ? Math.max(...precios) : precioFefo;
      const varios = precios.length > 1 && maxPrecio - minPrecio > 0.001;
      const stockLotes = lotes.reduce((s, l) => s + (Number(l.cantidad_actual) || 0), 0);

      return {
        ...prod,
        codigo: fefo?.codigo_barras ?? "",
        ubicacion: fefo?.ubicacion ?? prod.ubicacion ?? null,
        stock_actual: stockLotes > 0 ? stockLotes : Number(prod.stock_actual) || 0,
        precio_venta_fefo: precioFefo,
        precio_venta_desde: varios ? minPrecio : undefined,
        precio_venta_varios: varios,
      };
    });

    // Obtener todos los clientes
    const { data: clientes, error: cliError } = await supabase
      .from("ven_clientes")
      .select("*")
      .order("nombre", { ascending: true });

    if (cliError) throw new Error(cliError.message);

    return {
      productos: productosPos,
      clientes: clientes || [],
    };
  } catch (error: any) {
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
        "id, producto_id, codigo_barras, numero_lote, cantidad_actual, precio_costo, precio_venta, laboratorio, fecha_vencimiento, ubicacion, activo, inv_productos(*)",
      )
      .eq("codigo_barras", codigoNorm)
      .eq("activo", true)
      .gt("cantidad_actual", 0)
      .maybeSingle();

    if (error) {
      return { success: false as const, error: error.message };
    }
    const productoJoin = lote?.inv_productos;
    const productoRow = Array.isArray(productoJoin) ? productoJoin[0] : productoJoin;
    if (!lote || !productoRow) {
      return { success: false as const, error: "No hay lote activo con stock para ese código." };
    }

    if (!loteVendiblePorFecha(lote.fecha_vencimiento as string | null)) {
      return { success: false as const, error: "El lote está vencido y no se puede vender." };
    }

    const producto = productoRow as Producto;
    if (!producto.activo) {
      return { success: false as const, error: "El producto del lote está inactivo." };
    }

    const precioVenta = precioVentaDeLote(
      lote.precio_venta != null ? Number(lote.precio_venta) : null,
      producto.precio_base,
    );

    return {
      success: true as const,
      lote: {
        id: lote.id as string,
        producto_id: lote.producto_id as string,
        codigo_barras: lote.codigo_barras as string,
        numero_lote: (lote.numero_lote as string | null) ?? null,
        cantidad_actual: Number(lote.cantidad_actual) || 0,
        precio_costo: Number(lote.precio_costo) || 0,
        precio_venta: precioVenta,
        laboratorio: (lote.laboratorio as string | null) ?? null,
        fecha_vencimiento: (lote.fecha_vencimiento as string | null) ?? null,
        ubicacion: (lote.ubicacion as string | null) ?? null,
      },
      producto,
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

    const { data: producto, error: prodError } = await supabase
      .from("inv_productos")
      .select("id, nombre, precio_base, activo")
      .eq("id", productoId)
      .maybeSingle();

    if (prodError || !producto) {
      return { success: false as const, error: "Producto no encontrado." };
    }
    if (!producto.activo) {
      return { success: false as const, error: "El producto está inactivo." };
    }

    const { data: lotes, error } = await supabase
      .from("inv_lotes")
      .select(
        "id, codigo_barras, cantidad_actual, precio_costo, precio_venta, laboratorio, fecha_vencimiento, created_at",
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
        cantidad_actual: Number(l.cantidad_actual) || 0,
        precio_costo: Number(l.precio_costo) || 0,
        precio_venta: l.precio_venta != null ? Number(l.precio_venta) : null,
        laboratorio: (l.laboratorio as string | null) ?? null,
        fecha_vencimiento: (l.fecha_vencimiento as string | null) ?? null,
        created_at: (l.created_at as string | null) ?? null,
      })),
    );

    const resultado = asignarCantidadFefo(
      vendibles,
      cantidad,
      Number(producto.precio_base) || 0,
    );

    if (!resultado.ok) {
      return {
        success: false as const,
        error: `Stock insuficiente para ${producto.nombre}. Disponibles: ${resultado.cantidad_disponible}.`,
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

async function assertPreciosNoMenoresAlCosto(
  supabase: SupabaseClient,
  items: ItemVentaInput[],
) {
  for (const item of items) {
    const { data: prod } = await supabase
      .from("inv_productos")
      .select("nombre")
      .eq("id", item.producto_id)
      .maybeSingle();

    if (!prod) {
      throw new Error(`Producto con ID ${item.producto_id} no encontrado.`);
    }

    const costo = await obtenerCostoProductoOLote(
      supabase,
      item.producto_id,
      item.lote_id,
    );
    if (precioMenorQueCosto(item.precio_aplicado, costo)) {
      throw new Error(
        `El precio de "${prod.nombre}" no puede ser menor al costo (Q${costo.toFixed(2)}).`,
      );
    }
  }
}

async function precioVentaReferenciaItem(
  supabase: SupabaseClient,
  item: ItemVentaInput,
): Promise<number> {
  if (item.lote_id) {
    const { data: lote } = await supabase
      .from("inv_lotes")
      .select("precio_venta, producto_id")
      .eq("id", item.lote_id)
      .maybeSingle();
    if (lote) {
      const { data: prod } = await supabase
        .from("inv_productos")
        .select("precio_base")
        .eq("id", lote.producto_id)
        .maybeSingle();
      return precioVentaDeLote(
        lote.precio_venta != null ? Number(lote.precio_venta) : null,
        Number(prod?.precio_base) || 0,
      );
    }
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
    const { data: productosReceta } = await supabase
      .from("inv_productos")
      .select("id, requiere_receta")
      .in("id", productoIds);

    const requiereReceta = (productosReceta ?? []).some((p) =>
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
    for (const productoId of productoIdsVendidos) {
      const { data: prod } = await supabase
        .from("inv_productos")
        .select("nombre, stock_actual, stock_minimo")
        .eq("id", productoId)
        .single();

      const nuevoStock = Number(prod?.stock_actual) || 0;

      if (prod && nuevoStock <= prod.stock_minimo) {
        await sendPushNotification(
          {
            title: "⚠️ Alerta de Inventario",
            body: `El producto "${prod.nombre}" ha llegado a su stock mínimo (${nuevoStock} unidades restantes).`,
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

    const rol = await obtenerRolUsuario(supabase, user.id);
    if (rol !== "admin" && rol !== "super") {
      throw new Error("No tienes permiso para ver el historial de ventas.");
    }

    const { data, error } = await supabase
      .from("ventas")
      .select("*, ven_clientes(nombre, nit)")
      .order("created_at", { ascending: false });

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
  } catch (error: any) {
    console.error("Error en obtenerHistorialVentas:", error);
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

    const { data: ventasRaw, error } = await supabase
      .from("ventas")
      .select("*, ven_clientes(nombre, nit)")
      .gte("created_at", desdeIso)
      .lte("created_at", hastaIso)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false as const, error: error.message };
    }

    const ventas = (ventasRaw || []).filter((v) =>
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

    let detalles: {
      venta_id: string;
      cantidad: number;
      inv_productos: { nombre: string } | null;
    }[] = [];

    if (activasIds.length > 0) {
      const { data: detRaw, error: detError } = await supabase
        .from("ven_detalles")
        .select("venta_id, cantidad, inv_productos(nombre)")
        .in("venta_id", activasIds);

      if (detError) {
        return { success: false as const, error: detError.message };
      }
      detalles = (detRaw || []).map((row) => {
        const prod = row.inv_productos;
        const nombre =
          prod && typeof prod === "object" && "nombre" in prod
            ? String((prod as { nombre: string }).nombre)
            : "";
        return {
          venta_id: row.venta_id,
          cantidad: Number(row.cantidad) || 0,
          inv_productos: nombre ? { nombre } : null,
        };
      });
    }

    const reporte: ReporteVentasMes = {
      ...construirReporteVentasMes(
        ventas,
        anulacionesPorVentaId,
        detalles,
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
  total: string;
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

    const { data: recetas, error } = await supabase
      .from("ventas")
      .select(
        "id, created_at, numero_recibo, total, ven_clientes(nombre), ven_recetas!inner(medico_nombre, colegiado, numero_receta)",
      )
      .gte("created_at", desdeIso)
      .lte("created_at", hastaIso)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false as const, error: error.message };
    }

    const filas: VentaRecetaReporteRow[] = (recetas ?? []).map((v) => {
      const recetaRow = Array.isArray(v.ven_recetas)
        ? v.ven_recetas[0]
        : v.ven_recetas;
      const recibo =
        formatNumeroRecibo(v.numero_recibo as number | null) ||
        `#${v.numero_recibo ?? v.id.slice(0, 8)}`;
      const clientes = v.ven_clientes as { nombre: string } | { nombre: string }[] | null;
      const clienteNombre = Array.isArray(clientes)
        ? clientes[0]?.nombre
        : clientes?.nombre;
      return {
        recibo,
        fecha: formatFechaHoraGt(v.created_at as string),
        cliente: clienteNombre?.trim() || "Consumidor final",
        medico: (recetaRow as { medico_nombre: string }).medico_nombre,
        colegiado: (recetaRow as { colegiado: string }).colegiado,
        numero_receta:
          (recetaRow as { numero_receta?: string | null }).numero_receta?.trim() ||
          "—",
        total: fmtQ(Number(v.total) || 0),
      };
    });

    return {
      success: true as const,
      data: {
        fechaDesde,
        fechaHasta,
        generadoPor,
        filas,
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

export async function obtenerDetalleVenta(ventaId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("ven_detalles")
      .select(
        "*, inv_lotes(codigo_barras, numero_lote, precio_venta, precio_costo, laboratorio), inv_productos(nombre)",
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
      const costo = await obtenerCostoProductoOLote(
        supabaseRead,
        item.producto_id,
        item.lote_id,
      );
      if (precioMenorQueCosto(item.precio_aplicado, costo)) {
        return {
          success: false as const,
          error: `El precio de "${prod?.nombre ?? "producto"}" no puede ser menor al costo (Q${costo.toFixed(2)}).`,
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
