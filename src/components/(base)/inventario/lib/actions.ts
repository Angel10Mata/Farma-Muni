"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import {
  claveProductoUnico,
  identificacionProductoCompleta,
  MIN_CARACTERES_BUSQUEDA_PRODUCTO,
  normalizarTextoBusquedaProducto,
} from "./helpers";
import { productoSugerenciaSchema, type ProductoSugerencia } from "./zod";
import { activarProductoCatalogoPorNuevoLote } from "./sync-producto-catalogo";
import {
  ajustarConteoSchema,
  bajaLoteSchema,
  crearLoteManualSchema,
  devolverProveedorSchema,
  kardexFilaSchema,
  obtenerKardexSchema,
  productSchema,
  type KardexFila,
  type ProductFormValues,
} from "./zod";
import { requireInventario, requireRole } from "@/lib/auth-guards";
import {
  finTimestamptzDiaGt,
  inicioTimestamptzDiaGt,
  normalizarFechaCalendario,
} from "@/lib/fechas-gt";

const KARDEX_PAGE_SIZE = 50;

function mapRpcInventarioError(error: { message?: string; code?: string }) {
  const msg = (error.message ?? "").toLowerCase();
  if (msg.includes("sesión no válida") || msg.includes("sesion no valida")) {
    return "UNAUTHORIZED" as const;
  }
  if (msg.includes("no autorizado")) {
    return "FORBIDDEN" as const;
  }
  if (msg.includes("no encontrado")) {
    return "LOTE_NO_ENCONTRADO" as const;
  }
  if (
    msg.includes("motivo") ||
    msg.includes("cantidad") ||
    msg.includes("negativ") ||
    msg.includes("vencido")
  ) {
    return "VALIDATION" as const;
  }
  if (msg.includes("aún no está vencido") || msg.includes("aun no esta vencido")) {
    return "NOT_EXPIRED" as const;
  }
  if (msg.includes("no hay existencias") || msg.includes("stock")) {
    return "NO_STOCK" as const;
  }
  return "RPC_ERROR" as const;
}

async function requireKardexLectura() {
  return requireRole(["super", "admin", "inventario", "finanzas"]);
}

// Utilidades internas
function normalizarFechaLote(fecha: string) {
  const trimmed = fecha.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  return trimmed;
}

const LOTE_DUPLICATE_MSG = "Ya existe un lote con ese código de barras y número de lote";

function mapLoteDbError(error: { code?: string; message?: string }) {
  const msg = error.message ?? "";
  if (
    error.code === "23505" ||
    msg.includes("inv_lotes_codigo_lote_unique") ||
    msg.includes("inv_lotes_codigo_barras_unique")
  ) {
    return {
      success: false as const,
      code: "DUPLICATE" as const,
      detail: LOTE_DUPLICATE_MSG,
    };
  }
  return { success: false as const, code: "INTERNAL" as const };
}

const PRODUCTO_SUGERENCIA_SELECT =
  "id, nombre, nombre_generico, concentracion, forma_farmaceutica, presentacion, precio_base";

function mapFilaProductoSugerencia(row: Record<string, unknown>): ProductoSugerencia | null {
  const parsed = productoSugerenciaSchema.safeParse({
    id: row.id,
    nombre: row.nombre,
    nombre_generico: row.nombre_generico,
    concentracion: row.concentracion,
    forma_farmaceutica: row.forma_farmaceutica,
    presentacion: row.presentacion,
    precio_base: Number(row.precio_base) || 0,
  });
  return parsed.success ? parsed.data : null;
}

async function encontrarProductoPorClaveUnica(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campos: {
    nombre_generico: string;
    concentracion: string;
    forma_farmaceutica: string;
    presentacion: string;
  },
  excludeId?: string,
): Promise<ProductoSugerencia | null> {
  const clave = claveProductoUnico(campos);
  let query = supabase.from("inv_productos").select(PRODUCTO_SUGERENCIA_SELECT);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw error;
  for (const row of data ?? []) {
    const candidato = mapFilaProductoSugerencia(row as Record<string, unknown>);
    if (!candidato) continue;
    if (
      claveProductoUnico({
        nombre_generico: candidato.nombre_generico,
        concentracion: candidato.concentracion,
        forma_farmaceutica: candidato.forma_farmaceutica,
        presentacion: candidato.presentacion,
      }) === clave
    ) {
      return candidato;
    }
  }
  return null;
}

async function existeProductoDuplicado(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campos: {
    nombre_generico: string;
    concentracion: string;
    forma_farmaceutica: string;
    presentacion: string;
  },
  excludeId?: string,
) {
  return (await encontrarProductoPorClaveUnica(supabase, campos, excludeId)) !== null;
}

export async function buscarProductosSimilares(texto: string) {
  try {
    const guard = await requireInventario();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const term = texto.trim();
    if (term.length < MIN_CARACTERES_BUSQUEDA_PRODUCTO) {
      return { success: true as const, data: [] as ProductoSugerencia[] };
    }

    const needle = normalizarTextoBusquedaProducto(term);

    const { data, error } = await supabase
      .from("inv_productos")
      .select(PRODUCTO_SUGERENCIA_SELECT)
      .order("nombre_generico", { ascending: true })
      .limit(500);

    if (error) return { code: "INTERNAL" as const };

    const resultados: ProductoSugerencia[] = [];
    for (const row of data ?? []) {
      const item = mapFilaProductoSugerencia(row as Record<string, unknown>);
      if (!item) continue;
      const ng = normalizarTextoBusquedaProducto(item.nombre_generico);
      const n = normalizarTextoBusquedaProducto(item.nombre);
      if (!ng.includes(needle) && !n.includes(needle)) continue;
      resultados.push(item);
      if (resultados.length >= 8) break;
    }

    return { success: true as const, data: resultados };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function encontrarProductoDuplicadoExacto(campos: {
  nombre_generico: string;
  concentracion: string;
  forma_farmaceutica: string;
  presentacion: string;
}) {
  try {
    const guard = await requireInventario();
    if (!guard.ok) return { code: guard.code };
    if (!identificacionProductoCompleta(campos)) {
      return { success: true as const, data: null as ProductoSugerencia | null };
    }
    const producto = await encontrarProductoPorClaveUnica(guard.supabase, {
      nombre_generico: campos.nombre_generico.trim(),
      concentracion: campos.concentracion.trim(),
      forma_farmaceutica: campos.forma_farmaceutica,
      presentacion: campos.presentacion.trim(),
    });
    return { success: true as const, data: producto };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

function esErrorProductoUnico(error: { code?: string; message?: string }) {
  const msg = error.message ?? "";
  return error.code === "23505" && msg.includes("inv_productos_unico");
}

// Consultas de inventario
export async function obtenerProductos() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data, error } = await supabase
      .from("inv_productos")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) return { code: "INTERNAL" as const };
    return { success: true as const, data: data ?? [] };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function obtenerProducto(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data, error } = await supabase
      .from("inv_productos")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return { code: "NOT_FOUND" as const };
    return { success: true as const, data };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function obtenerUbicaciones() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data, error } = await supabase
      .from("inv_lotes")
      .select("ubicacion")
      .not("ubicacion", "is", null)
      .not("ubicacion", "eq", "");

    if (error) return { code: "INTERNAL" as const };

    const uniqueUbis = Array.from(new Set(data.map((d) => d.ubicacion))).filter(Boolean) as string[];
    return { success: true as const, data: uniqueUbis.sort() };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function obtenerLotes() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data, error } = await supabase
      .from("inv_lotes")
      .select(
        "id, producto_id, compra_detalle_id, codigo_barras, numero_lote, cantidad_inicial, cantidad_actual, precio_costo, precio_venta, proveedor_id, laboratorio, fecha_vencimiento, ubicacion, activo, inv_proveedores(nombre), inv_productos(id, nombre, nombre_generico, concentracion, forma_farmaceutica, presentacion, unidad_venta, requiere_receta, precio_base, stock_minimo, stock_actual, activo)",
      )
      .order("fecha_vencimiento", { ascending: true });

    if (error) return { code: "INTERNAL" as const };
    return { success: true as const, data: data ?? [] };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

// Activar o quitar del catálogo
export async function desactivarProducto(id: string) {
  try {
    const guard = await requireInventario();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const { error } = await supabase
      .from("inv_productos")
      .update({ activo: false })
      .eq("id", id);
    if (error) return { code: "INTERNAL" as const };

    revalidatePath("/farmamuni/inventario");
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function activarProducto(id: string) {
  try {
    const guard = await requireInventario();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const { error } = await supabase
      .from("inv_productos")
      .update({ activo: true })
      .eq("id", id);
    if (error) return { code: "INTERNAL" as const };

    revalidatePath("/farmamuni/inventario");
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

// Guardar producto
export async function guardarProducto(id: string | undefined, input: ProductFormValues) {
  try {
    const guard = await requireInventario();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const parsed = productSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const farmacia = {
      nombre_generico: parsed.data.nombre_generico,
      concentracion: parsed.data.concentracion,
      forma_farmaceutica: parsed.data.forma_farmaceutica,
      presentacion: parsed.data.presentacion,
    };

    try {
      const duplicado = await existeProductoDuplicado(supabase, farmacia, id);
      if (duplicado) return { code: "DUPLICATE" as const };
    } catch {
      return { code: "INTERNAL" as const };
    }

    const payload = {
      nombre: parsed.data.nombre,
      nombre_generico: parsed.data.nombre_generico,
      concentracion: parsed.data.concentracion,
      forma_farmaceutica: parsed.data.forma_farmaceutica,
      presentacion: parsed.data.presentacion,
      unidad_venta: parsed.data.unidad_venta || "unidad",
      requiere_receta: parsed.data.requiere_receta ?? false,
      descripcion: parsed.data.descripcion || null,
      precio_base: parsed.data.precio_base,
      stock_minimo: parsed.data.stock_minimo,
      activo: parsed.data.activo,
      imagen_url: parsed.data.imagen_url || null,
    };

    if (id) {
      const { error } = await supabase.from("inv_productos").update(payload).eq("id", id);
      if (error) {
        if (esErrorProductoUnico(error)) return { code: "DUPLICATE" as const };
        return { code: "INTERNAL" as const };
      }
      revalidatePath("/farmamuni/inventario");
      return { success: true as const, id };
    }

    const { data: inserted, error } = await supabase
      .from("inv_productos")
      .insert({
        ...payload,
        stock_actual: 0,
      })
      .select("id")
      .single();

    if (error) {
      if (esErrorProductoUnico(error)) return { code: "DUPLICATE" as const };
      return { code: "INTERNAL" as const };
    }
    if (!inserted) return { code: "INTERNAL" as const };

    revalidatePath("/farmamuni/inventario");
    return { success: true as const, id: inserted.id as string };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

// Lotes y bajas por vencimiento
export async function crearLoteManual(input: unknown) {
  try {
    const guard = await requireInventario();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const parsed = crearLoteManualSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const { error } = await supabase.from("inv_lotes").insert({
      producto_id: parsed.data.producto_id,
      proveedor_id: parsed.data.proveedor_id,
      laboratorio: parsed.data.laboratorio?.trim() || null,
      compra_detalle_id: null,
      codigo_barras: parsed.data.codigo_barras.trim(),
      numero_lote: parsed.data.numero_lote.trim(),
      cantidad_inicial: parsed.data.cantidad,
      cantidad_actual: parsed.data.cantidad,
      precio_costo: parsed.data.precio_costo,
      precio_venta: parsed.data.precio_venta,
      fecha_vencimiento: normalizarFechaLote(parsed.data.fecha_vencimiento),
      ubicacion: parsed.data.ubicacion?.trim() || null,
      activo: true,
    });

    if (error) return mapLoteDbError(error);

    try {
      await activarProductoCatalogoPorNuevoLote(supabase, parsed.data.producto_id);
    } catch {
      return { code: "INTERNAL" as const };
    }

    revalidatePath("/farmamuni/inventario");
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function ajustarLotePorConteo(input: unknown) {
  try {
    const guard = await requireInventario();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const parsed = ajustarConteoSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const { data, error } = await supabase.rpc("ajustar_lote_por_conteo", {
      p_lote_id: parsed.data.lote_id,
      p_cantidad_contada: parsed.data.cantidad_contada,
      p_motivo: parsed.data.motivo,
    });

    if (error) return { code: mapRpcInventarioError(error) };

    revalidatePath("/farmamuni/inventario");
    revalidatePath("/farmamuni/inventario/kardex");
    return { success: true as const, data };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function darBajaLote(input: unknown) {
  try {
    const guard = await requireInventario();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const parsed = bajaLoteSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const { data, error } = await supabase.rpc("dar_baja_lote_vencido", {
      p_lote_id: parsed.data.lote_id,
      p_motivo: parsed.data.motivo,
    });

    if (error) return { code: mapRpcInventarioError(error) };

    const unidades = typeof data === "number" ? data : Number(data) || 0;

    revalidatePath("/farmamuni/inventario");
    revalidatePath("/farmamuni/inventario/kardex");
    return { success: true as const, unidades };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function devolverLoteAProveedor(input: unknown) {
  try {
    const guard = await requireInventario();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const parsed = devolverProveedorSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const { data, error } = await supabase.rpc("devolver_lote_a_proveedor", {
      p_lote_id: parsed.data.lote_id,
      p_cantidad: parsed.data.cantidad,
      p_motivo: parsed.data.motivo,
    });

    if (error) return { code: mapRpcInventarioError(error) };

    revalidatePath("/farmamuni/inventario");
    revalidatePath("/farmamuni/inventario/kardex");
    return { success: true as const, data };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function registrarBajaPorVencimiento(input: unknown) {
  const parsed = bajaLoteSchema.safeParse({
    lote_id: typeof input === "object" && input && "lote_id" in input
      ? (input as { lote_id: string }).lote_id
      : undefined,
    motivo:
      typeof input === "object" && input && "motivo" in input
        ? (input as { motivo?: string }).motivo
        : typeof input === "object" && input && "notas" in input
          ? (input as { notas?: string }).notas
          : "Baja por vencimiento del lote",
  });
  if (!parsed.success) return { code: "VALIDATION" as const };
  const res = await darBajaLote(parsed.data);
  if (!res.success) return res;
  return { success: true as const, unidades: res.unidades };
}

export type ObtenerKardexResult = {
  filas: KardexFila[];
  total: number;
  pagina: number;
  pageSize: number;
  stockProductoActual: number | null;
  ultimoSaldoProductoKardex: number | null;
  saldoCoincide: boolean | null;
};

export async function obtenerKardex(input: unknown): Promise<
  | { code: "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "INTERNAL" }
  | { success: true; data: ObtenerKardexResult }
> {
  try {
    const guard = await requireKardexLectura();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const parsed = obtenerKardexSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const pagina = parsed.data.pagina ?? 1;
    const from = (pagina - 1) * KARDEX_PAGE_SIZE;
    const to = from + KARDEX_PAGE_SIZE - 1;

    let query = supabase
      .from("v_kardex")
      .select("*", { count: "exact" })
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

    const desdeIso = parsed.data.desde
      ? inicioTimestamptzDiaGt(normalizarFechaCalendario(parsed.data.desde))
      : null;
    const hastaIso = parsed.data.hasta
      ? finTimestamptzDiaGt(normalizarFechaCalendario(parsed.data.hasta))
      : null;

    if (desdeIso) query = query.gte("created_at", desdeIso);
    if (hastaIso) query = query.lte("created_at", hastaIso);

    const { data, error, count } = await query.range(from, to);

    if (error) {
      if (
        error.code === "PGRST103" ||
        error.message.includes("Requested range not satisfiable")
      ) {
        return {
          success: true,
          data: {
            filas: [],
            total: count ?? 0,
            pagina,
            pageSize: KARDEX_PAGE_SIZE,
            stockProductoActual: null,
            ultimoSaldoProductoKardex: null,
            saldoCoincide: null,
          },
        };
      }
      return { code: "INTERNAL" as const };
    }

    const filas: KardexFila[] = [];
    for (const row of data ?? []) {
      const safe = kardexFilaSchema.safeParse({
        ...row,
        cantidad: Number(row.cantidad),
        saldo_lote: row.saldo_lote != null ? Number(row.saldo_lote) : null,
        saldo_producto:
          row.saldo_producto != null ? Number(row.saldo_producto) : null,
      });
      if (safe.success) filas.push(safe.data);
    }

    let stockProductoActual: number | null = null;
    let ultimoSaldoProductoKardex: number | null = null;
    let saldoCoincide: boolean | null = null;

    if (parsed.data.productoId) {
      const { data: prod } = await supabase
        .from("inv_productos")
        .select("stock_actual")
        .eq("id", parsed.data.productoId)
        .maybeSingle();

      stockProductoActual = prod ? Number(prod.stock_actual) : 0;

      const { data: ultimo } = await supabase
        .from("v_kardex")
        .select("saldo_producto")
        .eq("producto_id", parsed.data.productoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      ultimoSaldoProductoKardex =
        ultimo?.saldo_producto != null ? Number(ultimo.saldo_producto) : null;

      if (ultimoSaldoProductoKardex != null) {
        saldoCoincide =
          Math.abs(stockProductoActual - ultimoSaldoProductoKardex) < 0.0001;
      }
    }

    return {
      success: true,
      data: {
        filas,
        total: count ?? filas.length,
        pagina,
        pageSize: KARDEX_PAGE_SIZE,
        stockProductoActual,
        ultimoSaldoProductoKardex,
        saldoCoincide,
      },
    };
  } catch {
    return { code: "INTERNAL" as const };
  }
}
