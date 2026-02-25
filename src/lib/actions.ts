"use server"

import { createClient } from "@/utils/supabase/server";
import { productoSchema, clienteSchema } from "./schemas"; // Agregamos clienteSchema
import { revalidatePath } from "next/cache";

// ==========================================
//          ACCIONES DE PRODUCTOS
// ==========================================

export async function crearProductoAction(datos: any) {
  const supabase = await createClient();

  try {
    const validatedData = productoSchema.parse(datos);

    const { data, error } = await supabase
      .from("productos")
      .insert([validatedData])
      .select();

    if (error) {
      console.error("Error de Supabase al crear producto:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/kore/productos"); 
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function editarProductoAction(id: string, datos: any) {
  const supabase = await createClient();

  try {
    const validatedData = productoSchema.parse(datos);

    const { data, error } = await supabase
      .from("productos")
      .update(validatedData)
      .eq("id", id) 
      .select();

    if (error) {
      console.error("Error de Supabase al editar producto:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/kore/productos");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function eliminarProductoAction(id: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("productos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error de Supabase al eliminar producto:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/kore/productos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
//          ACCIONES DE CLIENTES
// ==========================================

export async function crearClienteAction(datos: any) {
  const supabase = await createClient();

  try {
    // Usamos el esquema de clientes para validar
    const validatedData = clienteSchema.parse(datos);

    const { data, error } = await supabase
      .from("clientes") // Aseguramos que apunte a la tabla correcta
      .insert([validatedData])
      .select();

    if (error) {
      console.error("Error de Supabase al crear cliente:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/kore/clientes"); // Refresca la vista de clientes
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function editarClienteAction(id: string, datos: any) {
  const supabase = await createClient();

  try {
    const validatedData = clienteSchema.parse(datos);

    const { data, error } = await supabase
      .from("clientes")
      .update(validatedData)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error de Supabase al editar cliente:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/kore/clientes");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function eliminarClienteAction(id: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error de Supabase al eliminar cliente:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/kore/clientes");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
//          ACCIONES DE VENTAS
// ==========================================
import { ventaSchema } from "./schemas";

export async function crearVentaAction(datos: any) {
  const supabase = await createClient();

  try {
    const validatedData = ventaSchema.parse(datos);

    // 1. Buscamos el producto para ver si hay stock suficiente y saber su precio
    const { data: producto, error: errProd } = await supabase
      .from("productos")
      .select("stock, precio")
      .eq("id", validatedData.producto_id)
      .single();

    if (errProd || !producto) throw new Error("Producto no encontrado");
    if (producto.stock < validatedData.cantidad) throw new Error("Stock insuficiente para esta venta");

    // 2. Calculamos el total
    const totalVenta = producto.precio * validatedData.cantidad;

    // 3. Registramos la venta
    const { error: errVenta } = await supabase
      .from("ventas")
      .insert([{ ...validatedData, total: totalVenta }]);
    if (errVenta) throw errVenta;

    // 4. DESCONTAMOS EL STOCK DEL PRODUCTO
    const { error: errStock } = await supabase
      .from("productos")
      .update({ stock: producto.stock - validatedData.cantidad })
      .eq("id", validatedData.producto_id);
    if (errStock) throw errStock;

    // Actualizamos ambas pantallas
    revalidatePath("/kore/ventas");
    revalidatePath("/kore/productos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function eliminarVentaAction(id: string, producto_id: string, cantidad: number) {
  const supabase = await createClient();

  try {
    // 1. Borramos la venta
    const { error: errVenta } = await supabase.from("ventas").delete().eq("id", id);
    if (errVenta) throw errVenta;

    // 2. DEVOLVEMOS EL STOCK AL PRODUCTO
    const { data: producto } = await supabase.from("productos").select("stock").eq("id", producto_id).single();
    if (producto) {
      await supabase.from("productos").update({ stock: producto.stock + cantidad }).eq("id", producto_id);
    }

    revalidatePath("/kore/ventas");
    revalidatePath("/kore/productos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}