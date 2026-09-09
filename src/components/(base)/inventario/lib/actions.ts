"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { productSchema, type ProductFormValues } from "./zod";

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

export async function eliminarProducto(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { error } = await supabase.from("inv_productos").delete().eq("id", id);
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
