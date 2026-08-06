"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import {
  registrarMovimientoSchema,
  type TransaccionFinanciera,
  type ResumenFinanciero,
  type FiltroTipo,
  type CuentaPorCobrar,
  type CuentaPorPagar,
} from "./zod";

const FINANZAS_PATH = "/farmacia-la-salud/finanzas";
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

function sanitizeSearchTerm(term: string): string {
  return term.trim().replace(/[%_,]/g, (match) => `\\${match}`);
}

export interface ObtenerMovimientosParams {
  page?: number;
  pageSize?: number;
  tipo?: FiltroTipo;
  search?: string;
  desde?: string;
  hasta?: string;
}

export interface ObtenerMovimientosResult {
  data: TransaccionFinanciera[];
  count: number;
  page: number;
  pageSize: number;
  debug?: any;
}

export async function obtenerMovimientosFinancieros(
  params: ObtenerMovimientosParams = {}
): Promise<ObtenerMovimientosResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const tipo = params.tipo ?? "todos";
  const search = params.search ?? "";
  const desde = params.desde;
  const hasta = params.hasta;

  try {
    const supabase = await createClient();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("fin_transacciones")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (tipo !== "todos") {
      query = query.eq("tipo_movimiento", tipo);
    }
    
    if (desde) {
      query = query.gte("created_at", desde);
    }
    if (hasta) {
      query = query.lte("created_at", hasta);
    }

    if (search.trim().length > 0) {
      const term = sanitizeSearchTerm(search);
      query = query.or(`descripcion.ilike.%${term}%,categoria.ilike.%${term}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      if (error.code === 'PGRST103' || error.message.includes("Requested range not satisfiable")) {
        return {
          data: [],
          count: 0,
          page,
          pageSize,
        };
      }
      throw new Error(error.message);
    }

    return {
      data: (data ?? []) as TransaccionFinanciera[],
      count: count ?? 0,
      page,
      pageSize,
    };
  } catch (error: unknown) {
    console.error("Error en obtenerMovimientosFinancieros:", error);
    throw new Error(
      toErrorMessage(error, "No se pudieron cargar los movimientos financieros.")
    );
  }
}

export async function obtenerResumenFinanciero(desde?: string, hasta?: string): Promise<ResumenFinanciero> {
  try {
    const supabase = await createClient();

    let query = supabase.from("fin_transacciones").select("tipo_movimiento, monto");

    if (desde) query = query.gte("created_at", desde);
    if (hasta) query = query.lte("created_at", hasta);

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    let total_ingresos = 0;
    let total_egresos = 0;

    for (const row of (data || [])) {
      if (row.tipo_movimiento === 'INGRESO' || row.tipo_movimiento === 'ingreso') total_ingresos += Number(row.monto);
      if (row.tipo_movimiento === 'EGRESO' || row.tipo_movimiento === 'egreso') total_egresos += Number(row.monto);
    }

    return {
      total_ingresos,
      total_egresos,
      balance: total_ingresos - total_egresos,
    };
  } catch (error: unknown) {
    console.error("Error en obtenerResumenFinanciero:", error);
    throw new Error(toErrorMessage(error, "No se pudo calcular el resumen financiero."));
  }
}



export async function registrarMovimiento(
  input: unknown
): Promise<{ success: true; data: TransaccionFinanciera } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Sesión no válida o expirada.");

    const parsed = registrarMovimientoSchema.safeParse(input);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      throw new Error(firstIssue?.message ?? "Datos del movimiento inválidos.");
    }

    const payload = parsed.data;

    const { data, error } = await supabase
      .from("fin_transacciones")
      .insert({
        tipo_movimiento: payload.tipo_movimiento,
        categoria: payload.categoria,
        monto: payload.monto,
        descripcion: payload.descripcion,
        fecha_movimiento: payload.fecha_movimiento ?? new Date().toISOString(),
        usuario_id: user.id,
        venta_id: payload.tipo_movimiento === "ingreso" ? payload.venta_id ?? null : null,
        compra_id: payload.tipo_movimiento === "egreso" ? payload.compra_id ?? null : null,
        gasto_fijo_id:
          payload.tipo_movimiento === "egreso" ? payload.gasto_fijo_id ?? null : null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("No se recibió confirmación del registro.");

    revalidatePath(FINANZAS_PATH);
    return { success: true, data: data as TransaccionFinanciera };
  } catch (error: unknown) {
    console.error("Error al registrar movimiento:", error);
    return { success: false, error: toErrorMessage(error, "No se pudo registrar el movimiento.") };
  }
}

export async function eliminarMovimiento(id: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    if (!id || typeof id !== "string") {
      throw new Error("ID de movimiento inválido.");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Sesión no válida o expirada.");

    // Obtener la transacción original
    const { data: original, error: fetchError } = await supabase
      .from("fin_transacciones")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !original) {
      throw new Error("No se encontró el movimiento a anular.");
    }

    // Insertar la transacción inversa (monto negativo)
    const { error: insertError } = await supabase.from("fin_transacciones").insert({
      tipo_movimiento: original.tipo_movimiento,
      categoria: original.categoria,
      monto: -Math.abs(original.monto), // Monto negativo para revertir saldos
      descripcion: `Anulación: ${original.descripcion}`,
      fecha_movimiento: new Date().toISOString(),
      usuario_id: user.id,
      venta_id: original.venta_id,
      compra_id: original.compra_id,
      gasto_fijo_id: original.gasto_fijo_id,
    });

    if (insertError) throw new Error(insertError.message);

    // Si es una venta, sincronizar el estado [ANULADA] en el módulo de Ventas
    if (original.venta_id) {
      const { data: v } = await supabase.from("ventas").select("observaciones").eq("id", original.venta_id).single();
      const obs = v?.observaciones || "";
      if (!obs.includes("[ANULADA]")) {
        await supabase.from("ventas").update({ observaciones: `${obs} [ANULADA]`.trim() }).eq("id", original.venta_id);
      }
    }

    revalidatePath(FINANZAS_PATH);
    revalidatePath("/farmacia-la-salud/ventas");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error al anular movimiento:", error);
    return { success: false, error: toErrorMessage(error, "No se pudo anular el movimiento.") };
  }
}

export async function obtenerCuentasPorCobrar(): Promise<CuentaPorCobrar[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("fin_cuentas_por_cobrar");

    if (error) throw new Error(error.message);
    return (data ?? []) as CuentaPorCobrar[];
  } catch (error: unknown) {
    console.error("Error en obtenerCuentasPorCobrar:", error);
    throw new Error("No se pudieron cargar las cuentas por cobrar.");
  }
}

export async function obtenerCuentasPorPagar(): Promise<CuentaPorPagar[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("fin_cuentas_por_pagar");

    if (error) throw new Error(error.message);
    return (data ?? []) as CuentaPorPagar[];
  } catch (error: unknown) {
    console.error("Error en obtenerCuentasPorPagar:", error);
    throw new Error("No se pudieron cargar las cuentas por pagar.");
  }
}
