"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { isProductoVencido } from "./helpers";
import { bajaVencidoSchema, productSchema, type ProductFormValues } from "./zod";

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
      .from("inv_productos")
      .select("ubicacion")
      .not("ubicacion", "is", null)
      .not("ubicacion", "eq", "")
      .not("ubicacion", "eq", "Sin asignar");

    if (error) return { code: "INTERNAL" as const };

    const uniqueUbis = Array.from(new Set(data.map((d: any) => d.ubicacion))).filter(Boolean) as string[];
    return { success: true as const, data: uniqueUbis.sort() };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

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

export async function guardarProducto(id: string | undefined, input: ProductFormValues) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const parsed = productSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const payload = {
      nombre: parsed.data.nombre,
      codigo: parsed.data.codigo || null,
      descripcion: parsed.data.descripcion || null,
      precio_base: parsed.data.precio_base,
      precio_costo: parsed.data.precio_costo ?? 0,
      stock_actual: parsed.data.stock_actual,
      stock_minimo: parsed.data.stock_minimo,
      activo: parsed.data.activo,
      imagen_url: parsed.data.imagen_url || null,
      imagen_url_2: parsed.data.imagen_url_2 || null,
      imagen_url_3: parsed.data.imagen_url_3 || null,
      proveedor_id: parsed.data.proveedor_id || null,
      ubicacion: parsed.data.ubicacion?.trim() || "Sin asignar",
      fecha_vencimiento: parsed.data.fecha_vencimiento || null,
      numero_lote: parsed.data.numero_lote?.trim() || null,
    };

    if (id) {
      const { error } = await supabase.from("inv_productos").update(payload).eq("id", id);
      if (error) return { code: "INTERNAL" as const };
    } else {
      const { error } = await supabase.from("inv_productos").insert(payload);
      if (error) return { code: "INTERNAL" as const };
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

    const { data: producto, error: findError } = await supabase
      .from("inv_productos")
      .select("id, nombre, codigo, stock_actual, precio_costo, fecha_vencimiento, numero_lote")
      .eq("id", parsed.data.producto_id)
      .single();

    if (findError || !producto) return { code: "NOT_FOUND" as const };

    if (!isProductoVencido(producto.fecha_vencimiento)) {
      return { code: "NOT_EXPIRED" as const };
    }

    const unidades = Number(producto.stock_actual) || 0;
    if (unidades <= 0) return { code: "NO_STOCK" as const };

    const { error: updateError } = await supabase
      .from("inv_productos")
      .update({ stock_actual: 0 })
      .eq("id", producto.id);

    if (updateError) return { code: "INTERNAL" as const };

    const costoUnit = Number(producto.precio_costo) || 0;
    const montoPerdida = costoUnit > 0 ? costoUnit * unidades : 0;

    if (montoPerdida > 0) {
      const lote = producto.numero_lote ? ` lote ${producto.numero_lote}` : "";
      const notas = parsed.data.notas?.trim();
      const descripcion = notas
        ? `Baja por vencimiento: ${producto.nombre}${lote}. ${notas}`
        : `Baja por vencimiento: ${producto.nombre}${lote} (${unidades} u.)`;

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
