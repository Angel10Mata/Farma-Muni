"use server";

import { requireRole } from "@/lib/auth-guards";
import {
  finTimestamptzDiaGt,
  inicioTimestamptzDiaGt,
  normalizarFechaCalendario,
} from "@/lib/fechas-gt";
import { traerTodo } from "@/lib/reportes/paginacion";
import type { InvGenerico } from "../lib/jerarquia-zod";
import { invGenericoSchema } from "../lib/jerarquia-zod";
import {
  kardexFilaSchema,
  obtenerKardexSchema,
  type KardexFila,
  type ObtenerKardexInput,
} from "../lib/zod";
import {
  LOTES_INFORME_SELECT,
  mapLoteRawAFilaInforme,
  type FilaLoteInforme,
} from "./lote-informe";

const V_INV_GENERICOS_SELECT =
  "generico_id, catalogo_id, catalogo_nombre, concentracion, forma_farmaceutica, generico_nombre, requiere_receta, stock_minimo, activo, comerciales, comerciales_con_stock, stock_vendible, precio_desde, bajo_minimo";

async function requireInventarioInformes() {
  return requireRole(["super", "admin", "inventario", "finanzas", "ventas"]);
}

async function requireKardexInformes() {
  return requireRole(["super", "admin", "inventario", "finanzas"]);
}

export async function listarLotesInforme(): Promise<
  { success: true; data: FilaLoteInforme[] } | { code: string }
> {
  try {
    const guard = await requireInventarioInformes();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const filas = await traerTodo(async (desde, hasta) => {
      const { data, error } = await supabase
        .from("inv_lotes")
        .select(LOTES_INFORME_SELECT)
        .order("fecha_vencimiento", { ascending: true })
        .range(desde, hasta);
      return { data, error };
    });

    const mapped: FilaLoteInforme[] = [];
    for (const row of filas) {
      const fila = mapLoteRawAFilaInforme(
        row as unknown as Parameters<typeof mapLoteRawAFilaInforme>[0],
      );
      if (fila) mapped.push(fila);
    }
    return { success: true, data: mapped };
  } catch {
    return { code: "INTERNAL" };
  }
}

export async function listarGenericosInforme(): Promise<
  { success: true; data: InvGenerico[] } | { code: string }
> {
  try {
    const guard = await requireInventarioInformes();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const filas = await traerTodo(async (desde, hasta) => {
      const { data, error } = await supabase
        .from("v_inv_genericos")
        .select(V_INV_GENERICOS_SELECT)
        .order("catalogo_nombre", { ascending: true })
        .range(desde, hasta);
      return { data, error };
    });

    const parsed: InvGenerico[] = [];
    for (const row of filas) {
      const safe = invGenericoSchema.safeParse(row);
      if (safe.success) parsed.push(safe.data);
    }
    return { success: true, data: parsed };
  } catch {
    return { code: "INTERNAL" };
  }
}

export async function listarKardexInforme(
  input: ObtenerKardexInput,
): Promise<{ success: true; data: KardexFila[] } | { code: string }> {
  try {
    const guard = await requireKardexInformes();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const parsed = obtenerKardexSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" };

    const desdeIso = parsed.data.desde
      ? inicioTimestamptzDiaGt(normalizarFechaCalendario(parsed.data.desde))
      : null;
    const hastaIso = parsed.data.hasta
      ? finTimestamptzDiaGt(normalizarFechaCalendario(parsed.data.hasta))
      : null;

    const filas = await traerTodo(async (desde, hasta) => {
      let query = supabase
        .from("v_kardex")
        .select("*")
        .order("created_at", { ascending: false });

      if (parsed.data.productoId) {
        query = query.eq("producto_id", parsed.data.productoId);
      }
      if (parsed.data.loteId) {
        query = query.eq("lote_id", parsed.data.loteId);
      }
      if (parsed.data.tipo) {
        query = query.eq("tipo", parsed.data.tipo);
      }
      if (desdeIso) query = query.gte("created_at", desdeIso);
      if (hastaIso) query = query.lte("created_at", hastaIso);

      const { data, error } = await query.range(desde, hasta);
      return { data, error };
    });

    const out: KardexFila[] = [];
    for (const row of filas) {
      const safe = kardexFilaSchema.safeParse({
        ...row,
        cantidad: Number(row.cantidad),
        saldo_lote: row.saldo_lote != null ? Number(row.saldo_lote) : null,
        saldo_producto:
          row.saldo_producto != null ? Number(row.saldo_producto) : null,
      });
      if (safe.success) out.push(safe.data);
    }
    return { success: true, data: out };
  } catch {
    return { code: "INTERNAL" };
  }
}
