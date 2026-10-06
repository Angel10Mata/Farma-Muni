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
  payloadCoincideConVenta,
  precioMenorQueCosto,
  ventaEstaAnulada,
} from "./helpers";
import {
  construirReporteVentasMes,
  type ReporteVentasMes,
} from "./reporte-ventas-mes";
import { ultimoDiaMesCalendario } from "@/lib/fechas-gt";
import { ajustarStockPorVenta, obtenerCostoProductoOLote } from "./lotes-stock";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ItemVentaInput {
  producto_id: string;
  lote_id?: string | null;
  cantidad: number;
  precio_aplicado: number;
  subtotal: number;
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

    // Obtener todos los clientes
    const { data: clientes, error: cliError } = await supabase
      .from("ven_clientes")
      .select("*")
      .order("nombre", { ascending: true });

    if (cliError) throw new Error(cliError.message);

    return {
      productos: productos || [],
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
        "id, producto_id, codigo_barras, numero_lote, cantidad_actual, precio_costo, fecha_vencimiento, ubicacion, activo, inv_productos(*)",
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

    const producto = productoRow as Producto;
    if (!producto.activo) {
      return { success: false as const, error: "El producto del lote está inactivo." };
    }

    return {
      success: true as const,
      lote: {
        id: lote.id as string,
        producto_id: lote.producto_id as string,
        codigo_barras: lote.codigo_barras as string,
        numero_lote: (lote.numero_lote as string | null) ?? null,
        cantidad_actual: Number(lote.cantidad_actual) || 0,
        precio_costo: Number(lote.precio_costo) || 0,
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

export async function resolverLoteParaProducto(productoId: string, cantidad: number) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: "Sesión no válida o expirada." };
    }

    const { data: lotes, error } = await supabase
      .from("inv_lotes")
      .select("id, codigo_barras, cantidad_actual, precio_costo, fecha_vencimiento")
      .eq("producto_id", productoId)
      .eq("activo", true)
      .gt("cantidad_actual", 0)
      .order("fecha_vencimiento", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false as const, error: error.message };
    }

    const elegido = (lotes ?? []).find(
      (l) => Number(l.cantidad_actual) >= cantidad,
    );
    if (!elegido) {
      return {
        success: false as const,
        error: "No hay un lote con stock suficiente para esta cantidad.",
      };
    }

    return {
      success: true as const,
      lote_id: elegido.id as string,
      codigo_barras: elegido.codigo_barras as string,
      stock_lote: Number(elegido.cantidad_actual) || 0,
      precio_costo: Number(elegido.precio_costo) || 0,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "No se pudo asignar lote.";
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

async function assertAdminHistorialVentas(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Sesión no válida o expirada.");
  }
  const rol = await obtenerRolUsuario(supabase, user.id);
  if (rol !== "admin" && rol !== "super") {
    throw new Error("No tienes permiso para modificar ventas del historial.");
  }
  return user;
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

async function itemTieneRebajaEnServidor(
  supabase: SupabaseClient,
  item: ItemVentaInput,
): Promise<boolean> {
  const { data: prod } = await supabase
    .from("inv_productos")
    .select("precio_base")
    .eq("id", item.producto_id)
    .maybeSingle();
  if (!prod) return false;
  return esRebajaDePrecio(item.precio_aplicado, prod.precio_base);
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
}) {
  try {
    const supabase = await createClient();
    
    // Obtener usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesión no válida o expirada.");

    const { cliente_id, tipo_venta, total, observaciones, items, solicitud_rebaja_id } = params;

    if (!items || items.length === 0) {
      throw new Error("La venta debe contener al menos un producto.");
    }

    await assertRebajasAutorizadas(supabase, user.id, {
      cliente_id,
      tipo_venta,
      total,
      observaciones,
      items,
      solicitud_rebaja_id,
    });

    await assertPreciosNoMenoresAlCosto(supabase, items);

    const itemsConLote: ItemVentaInput[] = [];
    for (const item of items) {
      let loteId = item.lote_id ?? null;
      if (!loteId) {
        const resLote = await resolverLoteParaProducto(item.producto_id, item.cantidad);
        if (!resLote.success) {
          const { data: prod } = await supabase
            .from("inv_productos")
            .select("nombre, stock_actual")
            .eq("id", item.producto_id)
            .maybeSingle();
          if (!prod) {
            throw new Error(`Producto con ID ${item.producto_id} no encontrado.`);
          }
          if (Number(prod.stock_actual) < item.cantidad) {
            throw new Error(
              `Stock insuficiente para ${prod.nombre} (Disponibles: ${prod.stock_actual}, Solicitados: ${item.cantidad}).`,
            );
          }
        } else {
          loteId = resLote.lote_id;
        }
      }

      if (loteId) {
        const { data: lote, error: loteErr } = await supabase
          .from("inv_lotes")
          .select("cantidad_actual, activo, inv_productos(nombre)")
          .eq("id", loteId)
          .single();

        if (loteErr || !lote || !lote.activo) {
          throw new Error("Lote no válido o inactivo para la venta.");
        }
        const disp = Number(lote.cantidad_actual) || 0;
        const nombre =
          (lote.inv_productos as { nombre?: string } | null)?.nombre ?? "Producto";
        if (disp < item.cantidad) {
          throw new Error(
            `Stock insuficiente en lote para ${nombre} (Disponibles: ${disp}, Solicitados: ${item.cantidad}).`,
          );
        }
      }

      itemsConLote.push({ ...item, lote_id: loteId });
    }

    // 2. Insertar la venta
    const { data: venta, error: ventaError } = await supabase
      .from("ventas")
      .insert({
        cliente_id: cliente_id || null,
        usuario_id: user.id,
        tipo_venta,
        total,
        observaciones: observaciones || null,
      })
      .select("id, numero_recibo")
      .single();

    if (ventaError || !venta) {
      throw new Error(`Error al registrar la cabecera de venta: ${ventaError?.message}`);
    }

    // 3. Insertar los detalles de venta
    const detalles = itemsConLote.map((item) => ({
      venta_id: venta.id,
      producto_id: item.producto_id,
      lote_id: item.lote_id ?? null,
      cantidad: item.cantidad,
      precio_aplicado: item.precio_aplicado,
      subtotal: item.subtotal,
    }));

    const { error: detallesError } = await supabase
      .from("ven_detalles")
      .insert(detalles);

    if (detallesError) {
      // Nota: Si esto falla, idealmente querríamos deshacer la inserción anterior, 
      // pero en REST API procedemos a lanzar la excepción para notificar al cliente.
      throw new Error(`Error al registrar los detalles de venta: ${detallesError.message}`);
    }

    // 4. Descontar las existencias del inventario (lote o legacy)
    for (const item of itemsConLote) {
      await ajustarStockPorVenta(supabase, {
        producto_id: item.producto_id,
        lote_id: item.lote_id,
        delta: -item.cantidad,
      });

      const { data: prod } = await supabase
        .from("inv_productos")
        .select("nombre, stock_actual, stock_minimo")
        .eq("id", item.producto_id)
        .single();

      const nuevoStock = Number(prod?.stock_actual) || 0;

      if (prod && nuevoStock <= prod.stock_minimo) {
        await sendPushNotification(
          {
            title: '⚠️ Alerta de Inventario',
            body: `El producto "${prod.nombre}" ha llegado a su stock mínimo (${nuevoStock} unidades restantes).`,
            url: '/farmamuni/inventario'
          },
          ['all']
        );
      }
    }

    // 5. Registrar el ingreso en Finanzas (solo si no es crédito)
    const normalizedTipo = tipo_venta.toLowerCase();
    if (normalizedTipo !== "crédito" && normalizedTipo !== "credito") {
      // Intentar obtener el numero_recibo actualizado si vino nulo
      let numRecibo = venta.numero_recibo;
      if (!numRecibo) {
        const { data: vInfo } = await supabase.from("ventas").select("numero_recibo").eq("id", venta.id).single();
        if (vInfo && vInfo.numero_recibo) numRecibo = vInfo.numero_recibo;
      }

      const desc = numRecibo ? `Venta #${numRecibo} - ${tipo_venta}` : `Venta Directa - ${tipo_venta}`;

      const { error: finError } = await supabase
        .from("fin_transacciones")
        .insert({
          tipo_movimiento: "ingreso",
          categoria: "venta",
          monto: total,
          descripcion: desc,
          usuario_id: user.id,
          venta_id: venta.id
        });
        
      if (finError) {
        console.error("Error al registrar en finanzas:", finError);
        // No lanzamos error para no revertir la venta, pero queda logueado
      }
    }

    if (solicitud_rebaja_id) {
      const admin = createAdminClient();
      await admin
        .from("ven_solicitudes_rebaja")
        .update({
          estado: "completada",
          venta_id: venta.id,
        })
        .eq("id", solicitud_rebaja_id)
        .eq("solicitante_id", user.id);
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
      ...new Set(ventas.map((v) => v.usuario_id).filter(Boolean)),
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
    }));
  } catch (error: any) {
    console.error("Error en obtenerHistorialVentas:", error);
    throw new Error("No se pudo obtener el historial de ventas.");
  }
}

export async function obtenerBitacoraVenta(ventaId: string) {
  try {
    const supabase = await createClient();
    await assertAdminHistorialVentas(supabase);

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

export async function obtenerDetalleVenta(ventaId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("ven_detalles")
      .select("*, inv_lotes(codigo_barras, numero_lote), inv_productos(nombre)")
      .eq("venta_id", ventaId);

    if (error) throw new Error(error.message);

    return data || [];
  } catch (error: any) {
    console.error("Error en obtenerDetalleVenta:", error);
    throw new Error("No se pudo obtener el detalle de la venta.");
  }
}

// Anular venta
export async function anularVenta(ventaId: string, motivo: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Sesión no válida o expirada.");
    }
    const motivoLimpio = parseMotivoModificacionVenta(motivo);

    // 1. Obtener detalles de la venta (productos y cantidades)
    const { data: detalles, error: detError } = await supabase
      .from("ven_detalles")
      .select("producto_id, cantidad, lote_id")
      .eq("venta_id", ventaId);

    if (detError) throw new Error(detError.message);

    if (detalles && detalles.length > 0) {
      for (const item of detalles) {
        await ajustarStockPorVenta(supabase, {
          producto_id: item.producto_id,
          lote_id: item.lote_id,
          delta: item.cantidad,
        });
      }
    }

    // 3. Eliminar los detalles de la venta
    const { error: delDetallesError } = await supabase
      .from("ven_detalles")
      .delete()
      .eq("venta_id", ventaId);

    if (delDetallesError) throw new Error(delDetallesError.message);

    // 4. Revertir transacción financiera (si existe) en el módulo de Finanzas
    const { data: finTx } = await supabase
      .from("fin_transacciones")
      .select("*")
      .eq("venta_id", ventaId)
      .eq("categoria", "venta")
      .gt("monto", 0)
      .single();

    if (finTx) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("fin_transacciones").insert({
        tipo_movimiento: finTx.tipo_movimiento,
        categoria: finTx.categoria,
        monto: -Math.abs(finTx.monto),
        descripcion: `Anulación: ${finTx.descripcion}`,
        usuario_id: user?.id,
        venta_id: ventaId
      });
    }

    // 5. Marcar la venta principal como anulada (no eliminarla físicamente)
    const { data: vInfo } = await supabase.from("ventas").select("observaciones").eq("id", ventaId).single();
    const currentObs = vInfo?.observaciones || "";
    if (!currentObs.includes("[ANULADA]")) {
      const { error: updVentaError } = await supabase
        .from("ventas")
        .update({ observaciones: `${currentObs} [ANULADA]`.trim() })
        .eq("id", ventaId);
        
      if (updVentaError) throw new Error(updVentaError.message);
    }

    await registrarBitacoraVenta(supabase, {
      ventaId,
      usuarioId: user.id,
      accion: "anular",
      motivo: motivoLimpio,
    });

    // Revalidar rutas para refrescar cache de inventario, ventas y finanzas
    revalidatePath("/farmamuni/inventario");
    revalidatePath("/farmamuni/ventas");
    revalidatePath("/farmamuni/finanzas");

    return { success: true };
  } catch (error: any) {
    console.error("Error en anularVenta:", error);
    return {
      success: false,
      error: error.message || "Error al anular la venta."
    };
  }
}

// Corregir líneas del historial
export async function editarDetalleVentaDirecto(params: {
  detalleId: string;
  ventaId: string;
  productoId: string;
  nuevaCantidad: number;
  nuevoPrecio: number;
  motivo: string;
  productoNombre?: string;
}) {
  try {
    const supabase = await createClient();
    const user = await assertAdminHistorialVentas(supabase);
    const motivoLimpio = parseMotivoModificacionVenta(params.motivo);
    const { detalleId, ventaId, productoId, nuevaCantidad, nuevoPrecio, productoNombre } =
      params;

    // 1. Obtener la cantidad anterior del detalle para calcular la diferencia de stock
    const { data: detAnterior, error: getDetError } = await supabase
      .from("ven_detalles")
      .select("cantidad, precio_aplicado, lote_id")
      .eq("id", detalleId)
      .single();

    if (getDetError || !detAnterior) {
      throw new Error("No se encontró el detalle de la venta anterior.");
    }

    const cantidadAnterior = detAnterior.cantidad;
    const diffCantidad = nuevaCantidad - cantidadAnterior; // Si aumenta, descontamos más stock. Si disminuye, devolvemos stock.

    const loteId = detAnterior.lote_id as string | null;

    if (diffCantidad > 0) {
      if (loteId) {
        const { data: lote } = await supabase
          .from("inv_lotes")
          .select("cantidad_actual")
          .eq("id", loteId)
          .maybeSingle();
        const disp = Number(lote?.cantidad_actual) || 0;
        if (disp < diffCantidad) {
          throw new Error(
            `Stock insuficiente en el lote para aumentar la cantidad. Disponibles: ${disp}.`,
          );
        }
      } else {
        const { data: prod, error: getProdError } = await supabase
          .from("inv_productos")
          .select("nombre, stock_actual")
          .eq("id", productoId)
          .single();

        if (getProdError || !prod) {
          throw new Error("Producto no encontrado.");
        }

        if (prod.stock_actual < diffCantidad) {
          throw new Error(
            `Stock insuficiente para aumentar la cantidad. Disponibles: ${prod.stock_actual}.`,
          );
        }
      }
    }

    if (diffCantidad !== 0) {
      await ajustarStockPorVenta(supabase, {
        producto_id: productoId,
        lote_id: loteId,
        delta: -diffCantidad,
      });
    }

    // 4. Actualizar el item del detalle
    const nuevoSubtotal = nuevaCantidad * nuevoPrecio;
    const { error: updateDetError } = await supabase
      .from("ven_detalles")
      .update({
        cantidad: nuevaCantidad,
        precio_aplicado: nuevoPrecio,
        subtotal: nuevoSubtotal
      })
      .eq("id", detalleId);

    if (updateDetError) {
      throw new Error(`Error al actualizar el detalle: ${updateDetError.message}`);
    }

    // 5. Recalcular el total general de la venta
    const { data: todosLosDetalles, error: sumError } = await supabase
      .from("ven_detalles")
      .select("subtotal")
      .eq("venta_id", ventaId);

    if (sumError || !todosLosDetalles) {
      throw new Error("Error al recalcular el total de la venta.");
    }

    const nuevoTotalVenta = todosLosDetalles.reduce((sum, d) => sum + d.subtotal, 0);

    const { error: updateVentaError } = await supabase
      .from("ventas")
      .update({ total: nuevoTotalVenta })
      .eq("id", ventaId);

    if (updateVentaError) {
      throw new Error(`Error al actualizar el total de la venta: ${updateVentaError.message}`);
    }

    await registrarBitacoraVenta(supabase, {
      ventaId,
      usuarioId: user.id,
      accion: "editar_linea",
      motivo: motivoLimpio,
      detalle: {
        producto_id: productoId,
        producto_nombre: productoNombre ?? null,
        cantidad_anterior: cantidadAnterior,
        cantidad_nueva: nuevaCantidad,
        precio_anterior: detAnterior.precio_aplicado,
        precio_nuevo: nuevoPrecio,
      },
    });

    return { success: true, nuevoTotal: nuevoTotalVenta };
  } catch (error: any) {
    console.error("Error en editarDetalleVentaDirecto:", error);
    return { success: false, error: error.message || "Error al editar el detalle de la venta." };
  }
}

export async function eliminarDetalleVentaDirecto(params: {
  detalleId: string;
  ventaId: string;
  productoId: string;
  cantidadADevolver: number;
  motivo: string;
  productoNombre?: string;
}) {
  try {
    const supabase = await createClient();
    const user = await assertAdminHistorialVentas(supabase);
    const motivoLimpio = parseMotivoModificacionVenta(params.motivo);
    const { detalleId, ventaId, productoId, cantidadADevolver, productoNombre } = params;

    const { data: detRow } = await supabase
      .from("ven_detalles")
      .select("lote_id")
      .eq("id", detalleId)
      .maybeSingle();

    await ajustarStockPorVenta(supabase, {
      producto_id: productoId,
      lote_id: detRow?.lote_id ?? null,
      delta: cantidadADevolver,
    });

    // 3. Eliminar el registro del detalle de venta
    const { error: deleteDetError } = await supabase
      .from("ven_detalles")
      .delete()
      .eq("id", detalleId);

    if (deleteDetError) {
      throw new Error(`Error al eliminar el detalle de venta: ${deleteDetError.message}`);
    }

    // 4. Recalcular el total general de la venta
    const { data: todosLosDetalles, error: sumError } = await supabase
      .from("ven_detalles")
      .select("subtotal")
      .eq("venta_id", ventaId);

    if (sumError || !todosLosDetalles) {
      throw new Error("Error al recalcular el total de la venta.");
    }

    const nuevoTotalVenta = todosLosDetalles.reduce((sum, d) => sum + d.subtotal, 0);

    // 5. Actualizar el total en la cabecera de la venta
    const { error: updateVentaError } = await supabase
      .from("ventas")
      .update({ total: nuevoTotalVenta })
      .eq("id", ventaId);

    if (updateVentaError) {
      throw new Error(`Error al actualizar el total de la venta: ${updateVentaError.message}`);
    }

    // Enviar notificación de movimiento sospechoso a admins y supers
    await sendPushNotification(
      {
        title: '🚨 Movimiento Sospechoso',
        body: `Se ha anulado/eliminado un producto de la venta #${ventaId.slice(0, 8)}. Revisa las finanzas.`,
        url: '/farmamuni/ventas'
      },
      ['admin', 'super']
    );

    await registrarBitacoraVenta(supabase, {
      ventaId,
      usuarioId: user.id,
      accion: "quitar_linea",
      motivo: motivoLimpio,
      detalle: {
        producto_id: productoId,
        producto_nombre: productoNombre ?? null,
        cantidad_devuelta: cantidadADevolver,
      },
    });

    return { success: true, nuevoTotal: nuevoTotalVenta };
  } catch (error: any) {
    console.error("Error en eliminarDetalleVentaDirecto:", error);
    return { success: false, error: error.message || "Error al eliminar el producto de la venta." };
  }
}

// Rebajas y autorización de admin
export async function autorizarRebajaConCredencialesAdmin(
  solicitudId: string,
  username: string,
  clave: string,
) {
  try {
    const usuario = username.trim();
    if (!usuario || !clave) {
      return { success: false as const, error: "Usuario y contraseña son obligatorios." };
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
      return { success: false as const, error: "Credenciales incorrectas." };
    }

    const { data: profile } = await supabaseTemp
      .from("profiles")
      .select("rol")
      .eq("id", authData.user.id)
      .maybeSingle();

    const rol =
      profile?.rol || authData.user.user_metadata?.rol || "user";
    if (rol !== "admin" && rol !== "super") {
      return {
        success: false as const,
        error: "El usuario no tiene permisos de administrador.",
      };
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
        resuelto_por: authData.user.id,
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
      esRebajaDePrecio(i.precio_aplicado, i.precio_base),
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
      const costo = await obtenerCostoProductoOLote(supabaseRead, item.producto_id);
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
    const email = username.includes("@") ? username : `${username}@app.com`;
    
    // Crear un cliente temporal que no maneje sesiones ni cookies en el servidor
    const supabaseTemp = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    );

    const { data: authData, error: authError } = await supabaseTemp.auth.signInWithPassword({
      email,
      password: clave,
    });

    if (authError || !authData.user) {
      return { success: false, error: "Credenciales incorrectas." };
    }

    // Verificar el rol del usuario autenticado
    const { data: profile } = await supabaseTemp
      .from("profiles")
      .select("rol")
      .eq("id", authData.user.id)
      .single();
      
    const rol = profile?.rol || authData.user.user_metadata?.rol || "user";
    
    if (rol !== "admin" && rol !== "super") {
      return { success: false, error: "El usuario ingresado no tiene permisos de administrador." };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error en validarCredencialesAdmin:", error);
    return { success: false, error: "Error al validar credenciales." };
  }
}
