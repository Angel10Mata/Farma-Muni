"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { isProductoVencido, patchInvLoteCantidadActual } from "./helpers";
import {
  activarProductoCatalogoPorNuevoLote,
  syncInvProductoCatalogoDesdeLotes,
} from "./sync-producto-catalogo";
import {
  bajaVencidoSchema,
  crearLoteManualSchema,
  productSchema,
  type ProductFormValues,
} from "./zod";

// Utilidades internas
function normalizarFechaLote(fecha: string) {
  const trimmed = fecha.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  return trimmed;
}

function mapLoteDbError(error: { code?: string; message?: string }) {
  const msg = error.message ?? "";
  if (
    error.code === "23505" ||
    msg.includes("inv_lotes_codigo_barras_unique") ||
    msg.includes("codigo_barras")
  ) {
    return { code: "DUPLICATE" as const };
  }
  return { code: "INTERNAL" as const };
}

// Consultas de inventario
export async function obtenerProductos() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data, error } = await supabase
      .from("inv_productos")
      .select("*, inv_proveedores(nombre), inv_compras_detalles(inv_compras(inv_proveedores(nombre)))")
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
      .select("*, inv_proveedores(nombre)")
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
        "id, producto_id, compra_detalle_id, codigo_barras, numero_lote, cantidad_inicial, cantidad_actual, precio_costo, fecha_vencimiento, ubicacion, activo, inv_productos(id, nombre, precio_base, stock_minimo, stock_actual, activo, inv_proveedores(nombre))",
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const parsed = productSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const payload = {
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion || null,
      precio_base: parsed.data.precio_base,
      stock_minimo: parsed.data.stock_minimo,
      activo: parsed.data.activo,
      imagen_url: parsed.data.imagen_url || null,
      proveedor_id: parsed.data.proveedor_id || null,
    };

    if (id) {
      const { error } = await supabase.from("inv_productos").update(payload).eq("id", id);
      if (error) return { code: "INTERNAL" as const };
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

    if (error || !inserted) return { code: "INTERNAL" as const };

    revalidatePath("/farmamuni/inventario");
    return { success: true as const, id: inserted.id as string };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

// Lotes y bajas por vencimiento
export async function crearLoteManual(input: unknown) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const parsed = crearLoteManualSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const { error } = await supabase.from("inv_lotes").insert({
      producto_id: parsed.data.producto_id,
      compra_detalle_id: null,
      codigo_barras: parsed.data.codigo_barras.trim(),
      numero_lote: parsed.data.numero_lote.trim(),
      cantidad_inicial: parsed.data.cantidad,
      cantidad_actual: parsed.data.cantidad,
      precio_costo: parsed.data.precio_costo,
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

export async function registrarBajaPorVencimiento(input: unknown) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const parsed = bajaVencidoSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const { data: lote, error: findError } = await supabase
      .from("inv_lotes")
      .select(
        "id, producto_id, numero_lote, cantidad_actual, precio_costo, fecha_vencimiento, activo, inv_productos(nombre)",
      )
      .eq("id", parsed.data.lote_id)
      .single();

    if (findError || !lote) return { code: "NOT_FOUND" as const };

    if (!lote.activo) return { code: "VALIDATION" as const };

    if (!isProductoVencido(lote.fecha_vencimiento)) {
      return { code: "NOT_EXPIRED" as const };
    }

    const unidades = Number(lote.cantidad_actual) || 0;
    if (unidades <= 0) return { code: "NO_STOCK" as const };

    const { error: updateError } = await supabase
      .from("inv_lotes")
      .update(patchInvLoteCantidadActual(0))
      .eq("id", lote.id);

    if (updateError) return { code: "INTERNAL" as const };

    try {
      await syncInvProductoCatalogoDesdeLotes(supabase, lote.producto_id);
    } catch {
      return { code: "INTERNAL" as const };
    }

    const costoUnit = Number(lote.precio_costo) || 0;
    const montoPerdida = costoUnit > 0 ? costoUnit * unidades : 0;
    const productoJoin = lote.inv_productos as
      | { nombre?: string }
      | { nombre?: string }[]
      | null;
    const nombreProd = Array.isArray(productoJoin)
      ? productoJoin[0]?.nombre
      : productoJoin?.nombre;

    if (montoPerdida > 0) {
      const loteTxt = lote.numero_lote ? ` lote ${lote.numero_lote}` : "";
      const notas = parsed.data.notas?.trim();
      const descripcion = notas
        ? `Baja por vencimiento: ${nombreProd ?? "Producto"}${loteTxt}. ${notas}`
        : `Baja por vencimiento: ${nombreProd ?? "Producto"}${loteTxt} (${unidades} u.)`;

      const { error: finError } = await supabase.from("fin_transacciones").insert({
        tipo_movimiento: "egreso",
        categoria: "gasto_vario",
        monto: montoPerdida,
        descripcion: descripcion.slice(0, 200),
        fecha_movimiento: new Date().toISOString(),
        usuario_id: user.id,
        venta_id: null,
        compra_id: null,
        gasto_fijo_id: null,
      });

      if (finError) return { code: "INTERNAL" as const };
    }

    revalidatePath("/farmamuni/inventario");
    revalidatePath("/farmamuni/finanzas");
    return { success: true as const, unidades };
  } catch {
    return { code: "INTERNAL" as const };
  }
}
