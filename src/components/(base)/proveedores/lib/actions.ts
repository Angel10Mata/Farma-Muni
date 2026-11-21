"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ProveedorInputSchema, ProveedorInput, CompraSchema, CompraInput } from "./zod";
import { detalleCodigoBarrasDuplicado } from "@/lib/inv-lote-codigo-barras";
import { FACTURA_DUPLICATE_MSG } from "./compras-helpers";
import { normalizarFechaCalendario } from "@/lib/fechas-gt";
import { totalPagadoCompra } from "./compras-helpers";
import { requireAdmin, requireRole } from "@/lib/auth-guards";

const PROVEEDORES_WRITE_ROLES = [
  "super",
  "admin",
  "inventario",
  "proveedores",
  "finanzas",
] as const;

type ActionFail = { success?: false; code: string; detail?: string };

// Helpers
const LOTE_DUPLICATE_MSG = "Ya existe un lote con ese código de barras y número de lote";

function mapDbError(error: { code?: string; message?: string }): ActionFail {
  const msg = error.message ?? "";
  if (
    error.code === "23505" ||
    msg.includes("inv_lotes_codigo_lote_unique") ||
    msg.includes("inv_lotes_codigo_barras_unique")
  ) {
    return {
      code: "DUPLICATE",
      detail: LOTE_DUPLICATE_MSG,
    };
  }
  if (
    error.code === "23505" &&
    (msg.includes("inv_compras_proveedor_numero_factura_unique") ||
      msg.toLowerCase().includes("numero_factura"))
  ) {
    return { code: "DUPLICATE", detail: FACTURA_DUPLICATE_MSG };
  }
  if (error.code === "42501" || msg.toLowerCase().includes("row-level security")) {
    return {
      code: "FORBIDDEN",
      detail: "Permiso denegado (RLS). Ejecuta la migración de políticas de compras en Supabase.",
    };
  }
  return { code: "DB_ERROR", detail: msg.slice(0, 200) || undefined };
}

function esEstadoPagado(estado: string) {
  return estado.trim().toLowerCase() === "pagado";
}

function normalizarFechaLote(fecha: string) {
  const trimmed = fecha.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  return trimmed;
}

// Proveedores
export async function obtenerProveedores() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data, error } = await supabase
      .from("inv_proveedores")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) return mapDbError(error);
    return { success: true as const, data: data ?? [] };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function guardarProveedor(id: string | undefined, input: ProveedorInput) {
  try {
    const guard = await requireRole([...PROVEEDORES_WRITE_ROLES]);
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const parsed = ProveedorInputSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const payload = {
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion || null,
      nit: parsed.data.nit || null,
      telefono: parsed.data.telefono || null,
      correo: parsed.data.correo || null,
    };

    if (id) {
      const { error } = await supabase.from("inv_proveedores").update(payload).eq("id", id);
      if (error) return { code: "INTERNAL" as const };
    } else {
      const { error } = await supabase.from("inv_proveedores").insert({ ...payload, activo: true });
      if (error) return { code: "INTERNAL" as const };
    }

    revalidatePath("/farmamuni/proveedores");
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function setProveedorActivo(id: string, activo: boolean) {
  try {
    const guard = await requireRole([...PROVEEDORES_WRITE_ROLES]);
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const { error } = await supabase.from("inv_proveedores").update({ activo }).eq("id", id);
    if (error) return { code: "INTERNAL" as const };

    revalidatePath("/farmamuni/proveedores");
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function eliminarProveedor(id: string) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const { error } = await supabase.from("inv_proveedores").delete().eq("id", id);
    if (error) return { code: "INTERNAL" as const };

    revalidatePath("/farmamuni/proveedores");
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

// Pantalla de nueva compra
export async function obtenerProveedoresYProductos() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data: proveedores, error: provError } = await supabase
      .from("inv_proveedores")
      .select("*")
      .order("nombre", { ascending: true });

    if (provError) return mapDbError(provError);

    const { data: comercialesRaw, error: prodError } = await supabase
      .from("v_inv_comerciales")
      .select(
        "producto_id, nombre_comercial, presentacion, precio_venta, activo, catalogo_id, catalogo_nombre, generico_id, generico_nombre, concentracion, forma_farmaceutica, laboratorio_id, laboratorio_nombre, stock_vendible",
      )
      .order("nombre_comercial", { ascending: true });

    if (prodError) return { code: "INTERNAL" as const };

    const { data: lotesProv, error: lotesError } = await supabase
      .from("inv_lotes")
      .select("producto_id, proveedor_id, created_at")
      .not("proveedor_id", "is", null)
      .order("created_at", { ascending: false });

    if (lotesError) return { code: "INTERNAL" as const };

    const { data: detallesCompra, error: detallesError } = await supabase
      .from("inv_compras_detalles")
      .select("producto_id, inv_compras(proveedor_id, created_at)");

    if (detallesError) return { code: "INTERNAL" as const };

    const { data: laboratoriosProv, error: labProvError } = await supabase
      .from("inv_laboratorios")
      .select("id, proveedor_id");

    if (labProvError) return { code: "INTERNAL" as const };

    const proveedorPorLaboratorio = new Map<string, string>();
    for (const lab of laboratoriosProv ?? []) {
      if (lab.proveedor_id) {
        proveedorPorLaboratorio.set(String(lab.id), String(lab.proveedor_id));
      }
    }

    const ultimoProveedorPorProducto = new Map<string, { proveedorId: string; at: string }>();

    const registrarCandidato = (
      productoId: string,
      proveedorId: string,
      at: string,
    ) => {
      const prev = ultimoProveedorPorProducto.get(productoId);
      if (!prev || at > prev.at) {
        ultimoProveedorPorProducto.set(productoId, { proveedorId, at });
      }
    };

    for (const row of lotesProv ?? []) {
      if (!row.proveedor_id) continue;
      registrarCandidato(
        String(row.producto_id),
        String(row.proveedor_id),
        String(row.created_at ?? ""),
      );
    }

    for (const row of detallesCompra ?? []) {
      const compra = row.inv_compras as
        | { proveedor_id?: string | null; created_at?: string | null }
        | null
        | undefined;
      if (!compra?.proveedor_id) continue;
      registrarCandidato(
        String(row.producto_id),
        String(compra.proveedor_id),
        String(compra.created_at ?? ""),
      );
    }

    const comerciales = (comercialesRaw ?? []).map((row) => {
      const productoId = String(row.producto_id);
      return {
        id: productoId,
        nombre_comercial: String(row.nombre_comercial ?? ""),
        presentacion: String(row.presentacion ?? ""),
        precio_venta: Number(row.precio_venta) || 0,
        activo: Boolean(row.activo),
        catalogo_id: String(row.catalogo_id),
        catalogo_nombre: String(row.catalogo_nombre ?? ""),
        generico_id: String(row.generico_id),
        generico_nombre: String(row.generico_nombre ?? ""),
        concentracion: String(row.concentracion ?? ""),
        forma_farmaceutica: String(row.forma_farmaceutica ?? ""),
        laboratorio_id: row.laboratorio_id != null ? String(row.laboratorio_id) : null,
        laboratorio_nombre:
          row.laboratorio_nombre != null ? String(row.laboratorio_nombre) : null,
        stock_vendible: Number(row.stock_vendible) || 0,
        ultimo_proveedor_id:
          ultimoProveedorPorProducto.get(productoId)?.proveedorId ??
          (row.laboratorio_id != null
            ? proveedorPorLaboratorio.get(String(row.laboratorio_id)) ?? null
            : null),
      };
    });

    return {
      success: true as const,
      data: { proveedores: proveedores ?? [], comerciales },
    };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function verificarCodigoBarrasEnCompra(codigoBarras: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const codigo = codigoBarras.trim();
    if (!codigo) {
      return { code: "VALIDATION" as const, detail: "El código de barras es obligatorio." };
    }

    const { data } = await supabase
      .from("inv_lotes")
      .select("id")
      .eq("codigo_barras", codigo)
      .limit(1)
      .maybeSingle();

    if (!data) {
      return { success: true as const, disponible: true as const };
    }

    const detail = await detalleCodigoBarrasDuplicado(supabase, codigo);
    return { success: true as const, disponible: false as const, detail };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function crearCompra(input: CompraInput) {
  try {
    const guard = await requireRole([...PROVEEDORES_WRITE_ROLES]);
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const parsed = CompraSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const {
      proveedor_id,
      estado_pago,
      observaciones,
      items,
      numero_factura,
      fecha_vencimiento_pago,
    } = parsed.data;
    const pagado = esEstadoPagado(estado_pago);

    const payloadCompra = {
      proveedor_id,
      estado_pago: pagado ? "Pagado" : estado_pago,
      numero_factura: numero_factura.trim(),
      fecha_vencimiento_pago:
        pagado ? null : fecha_vencimiento_pago?.trim().slice(0, 10) || null,
      observaciones: observaciones?.trim() || null,
    };

    const payloadItems = items.map((item) => ({
      producto_id: item.producto_id,
      codigo_barras: item.codigo_barras.trim(),
      numero_lote: item.numero_lote.trim(),
      fecha_vencimiento: normalizarFechaLote(item.fecha_vencimiento),
      ubicacion: item.ubicacion?.trim() || null,
      cantidad: item.cantidad,
      precio_costo: item.precio_costo,
      subtotal: item.subtotal,
      actualizar_precio_venta: item.actualizar_precio_venta ?? false,
      precio_venta: item.precio_venta,
    }));

    const { data, error } = await supabase.rpc("registrar_compra", {
      p_compra: payloadCompra,
      p_items: payloadItems,
    });

    if (error) {
      const msg = error.message ?? "";
      if (
        msg.includes("código de barras") ||
        msg.includes("codigo de barras") ||
        msg.includes("duplicados")
      ) {
        return { code: "DUPLICATE" as const, detail: msg };
      }
      if (msg.includes("factura")) {
        return { code: "DUPLICATE" as const, detail: FACTURA_DUPLICATE_MSG };
      }
      if (msg.includes("No autorizado") || msg.includes("Sesión")) {
        return { code: "FORBIDDEN" as const, detail: msg.slice(0, 200) };
      }
      return { code: "DB_ERROR" as const, detail: msg.slice(0, 200) || undefined };
    }

    const compraId =
      data && typeof data === "object" && "compra_id" in data
        ? String((data as { compra_id: string }).compra_id)
        : null;

    if (!compraId) {
      return { code: "DB_ERROR" as const, detail: "No se recibió el identificador de la compra." };
    }

    revalidatePath("/farmamuni/inventario");
    revalidatePath("/farmamuni/proveedores");
    revalidatePath("/farmamuni/finanzas");

    return { success: true as const, compra_id: compraId };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error inesperado.";
    return { code: "INTERNAL" as const, detail: message };
  }
}

// Historial de compras
export async function obtenerHistorialCompras() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data, error } = await supabase
      .from("inv_compras")
      .select("*, inv_proveedores(nombre, nit), fin_transacciones(*), inv_compras_detalles(*, inv_productos(nombre))")
      .order("created_at", { ascending: false });

    if (error) return { code: "INTERNAL" as const };
    return { success: true as const, data: data ?? [] };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function obtenerComprasProveedor(proveedorId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data, error } = await supabase
      .from("inv_compras")
      .select(
        "id, created_at, total, numero_factura, fecha_vencimiento_pago, estado_pago, fin_transacciones(id, monto, fecha_movimiento, tipo_movimiento, categoria)",
      )
      .eq("proveedor_id", proveedorId)
      .order("created_at", { ascending: false });

    if (error) return { code: "INTERNAL" as const };
    return { success: true as const, data: data ?? [] };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function obtenerDetalleCompra(compraId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data, error } = await supabase
      .from("inv_compras_detalles")
      .select(
        "*, inv_productos(nombre, presentacion), inv_lotes(numero_lote, fecha_vencimiento)",
      )
      .eq("compra_id", compraId);

    if (error) return { code: "INTERNAL" as const };
    return { success: true as const, data: data ?? [] };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

// Cuentas por pagar y abonos
export async function actualizarEstadoPagoCompra(compraId: string, nuevoEstado: "Pagado" | "Pendiente") {
  try {
    const guard = await requireRole([...PROVEEDORES_WRITE_ROLES]);
    if (!guard.ok) return { code: guard.code };
    const { supabase, user } = guard;

    const { data: compra, error: compraErr } = await supabase
      .from("inv_compras")
      .select("total, estado_pago")
      .eq("id", compraId)
      .single();

    if (compraErr) return { code: "INTERNAL" as const };

    const { data: txs } = await supabase
      .from("fin_transacciones")
      .select("monto, categoria")
      .eq("compra_id", compraId)
      .in("categoria", ["pago_proveedor", "compra"]);

    const pagadoActual = totalPagadoCompra(txs);
    const totalCompra = Number(compra.total) || 0;
    const saldo = Math.max(0, totalCompra - pagadoActual);

    if (nuevoEstado === "Pagado" && compra.estado_pago !== "Pagado") {
      if (saldo > 0.01) {
        const { error: finError } = await supabase.from("fin_transacciones").insert({
          tipo_movimiento: "egreso",
          categoria: "pago_proveedor",
          monto: saldo,
          descripcion: `Pago total de compra marcado desde Proveedores`,
          usuario_id: user.id,
          compra_id: compraId,
        });
        if (finError) return { code: "INTERNAL" as const };
      }
    } else if (nuevoEstado === "Pendiente" && compra.estado_pago !== "Pendiente") {
      if (pagadoActual > 0.01) {
        const { error: finError } = await supabase.from("fin_transacciones").insert({
          tipo_movimiento: "egreso",
          categoria: "pago_proveedor",
          monto: -pagadoActual,
          descripcion: `Reverso al marcar compra como Pendiente`,
          usuario_id: user.id,
          compra_id: compraId,
        });
        if (finError) return { code: "INTERNAL" as const };
      }
    }

    const payload = {
      estado_pago: nuevoEstado,
      fecha_pago: nuevoEstado === "Pagado" ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("inv_compras").update(payload).eq("id", compraId);
    if (error) return { code: "INTERNAL" as const };

    revalidatePath("/farmamuni/proveedores");
    revalidatePath("/farmamuni/finanzas");
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function registrarAbonoCompra(
  compraId: string,
  montoAbono: number,
  metodoPago: string,
  notas?: string
) {
  try {
    const guard = await requireRole([...PROVEEDORES_WRITE_ROLES]);
    if (!guard.ok) return { code: guard.code };
    const { supabase, user } = guard;

    if (!montoAbono || montoAbono <= 0) return { code: "VALIDATION" as const };

    const { data: compra, error: compraError } = await supabase
      .from("inv_compras")
      .select("*, fin_transacciones(monto, categoria)")
      .eq("id", compraId)
      .single();

    if (compraError || !compra) return { code: "NOT_FOUND" as const };

    const pagado = totalPagadoCompra(compra.fin_transacciones);
    const totalCompra = Number(compra.total) || 0;
    const saldo = Math.max(0, totalCompra - pagado);
    if (montoAbono > saldo + 0.01) return { code: "VALIDATION" as const };

    const desc = notas
      ? `Abono a cuenta por pagar (${metodoPago}): ${notas}`
      : `Abono a cuenta por pagar (${metodoPago})`;

    const { error: finError } = await supabase.from("fin_transacciones").insert({
      tipo_movimiento: "egreso",
      categoria: "pago_proveedor",
      monto: montoAbono,
      descripcion: desc,
      usuario_id: user.id,
      compra_id: compraId,
    });

    if (finError) return { code: "INTERNAL" as const };

    const pagadoTras = pagado + montoAbono;
    const estadoTras =
      pagadoTras >= totalCompra - 0.01
        ? "Pagado"
        : pagadoTras <= 0.01
          ? "Pendiente"
          : compra.estado_pago;
    await supabase
      .from("inv_compras")
      .update({
        estado_pago: estadoTras,
        fecha_pago: pagadoTras >= totalCompra - 0.01 ? new Date().toISOString() : null,
      })
      .eq("id", compraId);

    revalidatePath("/farmamuni/proveedores");
    revalidatePath("/farmamuni/finanzas");
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export type CompraProveedorReporteRow = {
  proveedor: string;
  factura: string;
  fecha: string;
  vence: string | null;
  total: number;
  pagado: number;
  saldo: number;
  vencida: boolean;
};

export async function obtenerReporteComprasProveedor(
  fechaDesde: string,
  fechaHasta: string,
  proveedorId?: string | null,
  soloSaldoPendiente?: boolean,
) {
  try {
    if (!fechaDesde || !fechaHasta) {
      return { success: false as const, error: "Indica el rango de fechas." };
    }

    const guard = await requireRole([...PROVEEDORES_WRITE_ROLES]);
    if (!guard.ok) {
      return { success: false as const, error: "No tienes permiso para exportar este reporte." };
    }
    const { supabase, user } = guard;

    const { data: perfil } = await supabase
      .from("profiles")
      .select("nombre")
      .eq("id", user.id)
      .maybeSingle();
    const generadoPor = perfil?.nombre?.trim() || "Sin nombre";

    const desdeIso = `${fechaDesde}T00:00:00.000-06:00`;
    const hastaIso = `${fechaHasta}T23:59:59.999-06:00`;

    let query = supabase
      .from("inv_compras")
      .select(
        "id, created_at, total, numero_factura, fecha_vencimiento_pago, inv_proveedores(nombre), fin_transacciones(monto, categoria)",
      )
      .gte("created_at", desdeIso)
      .lte("created_at", hastaIso)
      .order("created_at", { ascending: true });

    if (proveedorId) {
      query = query.eq("proveedor_id", proveedorId);
    }

    const { data: compras, error } = await query;
    if (error) {
      return { success: false as const, error: error.message };
    }

    const hoy = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Guatemala" }),
    );
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

    const filas: CompraProveedorReporteRow[] = [];
    for (const c of compras ?? []) {
      const prov = c.inv_proveedores as { nombre?: string } | null;
      const pagado = totalPagadoCompra(c.fin_transacciones as unknown[]);
      const total = Number(c.total) || 0;
      const saldo = Math.max(0, total - pagado);
      if (soloSaldoPendiente && saldo <= 0.009) continue;
      const venceRaw = normalizarFechaCalendario(
        c.fecha_vencimiento_pago as string | null,
      );
      const vencida = saldo > 0.009 && venceRaw && venceRaw < hoyStr;
      filas.push({
        proveedor: prov?.nombre?.trim() || "Proveedor",
        factura: (c.numero_factura as string | null)?.trim() || "—",
        fecha: c.created_at as string,
        vence: venceRaw || null,
        total,
        pagado,
        saldo,
        vencida: Boolean(vencida),
      });
    }

    return {
      success: true as const,
      data: {
        fechaDesde,
        fechaHasta,
        generadoPor,
        soloSaldoPendiente: Boolean(soloSaldoPendiente),
        filas,
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo generar el reporte de compras.";
    return { success: false as const, error: message };
  }
}
