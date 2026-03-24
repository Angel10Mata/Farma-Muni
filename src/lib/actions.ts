"use server"

import { createClient } from "@/utils/supabase/server";
// IMPORTANTE: Agregamos recetaSchema a la lista de importaciones
import { productoSchema, clienteSchema, ventaSchema, consultaSchema, turnoSchema, recetaSchema } from "./schemas"; 
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
//          ACCIONES DE CLIENTES (PACIENTES)
// ==========================================

export async function crearClienteAction(datos: any) {
  const supabase = await createClient();

  try {
    const validatedData = clienteSchema.parse(datos);

    const { data, error } = await supabase
      .from("clientes") 
      .insert([validatedData])
      .select();

    if (error) {
      console.error("Error de Supabase al crear cliente:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/kore/clientes"); 
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
//          ACCIONES DE VENTAS (DISPENSACIÓN)
// ==========================================

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
    if (producto.stock < validatedData.cantidad) throw new Error("Stock insuficiente para esta entrega");

    // 2. CALCULAMOS EL TOTAL (NUEVA LÓGICA DE AYUDA SOCIAL)
    const esDonacion = validatedData.tipo_transaccion === 'Donación';
    const totalVenta = esDonacion ? 0 : (producto.precio * validatedData.cantidad);

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

// ==========================================
//          ACCIONES DE CONSULTAS MÉDICAS
// ==========================================

export async function crearConsultaAction(datos: any) {
  const supabase = await createClient();

  try {
    const validatedData = consultaSchema.parse(datos);

    const { data, error } = await supabase
      .from("consultas")
      .insert([validatedData])
      .select();

    if (error) {
      console.error("Error de Supabase al registrar consulta:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/kore/clientes"); 
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function eliminarConsultaAction(id: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("consultas")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error de Supabase al eliminar consulta:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/kore/clientes");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
//          ACCIONES DE SALA DE ESPERA (TURNOS)
// ==========================================
export async function crearTurnoAction(datos: any) {
  const supabase = await createClient();
  try {
    const validatedData = turnoSchema.parse(datos);
    const { error } = await supabase.from("turnos").insert([validatedData]);
    if (error) throw error;
    revalidatePath("/kore/turnos"); 
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function cambiarEstadoTurnoAction(id: string, nuevoEstado: string) {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from("turnos").update({ estado: nuevoEstado }).eq("id", id);
    if (error) throw error;
    revalidatePath("/kore/turnos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
//      ACCIONES DE RECETAS ELECTRÓNICAS
// ==========================================

export async function crearRecetaAction(datos: any) {
  const supabase = await createClient();
  try {
    const validatedData = recetaSchema.parse(datos);
    const { error } = await supabase.from("recetas").insert([validatedData]);
    
    if (error) throw error;
    
    // Avisamos a la pantalla de ventas que hay una nueva receta
    revalidatePath("/kore/ventas"); 
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function despacharRecetaAction(recetaId: string, medicamentos: any[], clienteId: string) {
  const supabase = await createClient();
  try {
    // 1. Cambiamos la receta de 'Pendiente' a 'Entregada'
    const { error: errReceta } = await supabase
      .from("recetas")
      .update({ estado: 'Entregada' })
      .eq("id", recetaId);
      
    if (errReceta) throw errReceta;

    // 2. MAGIA: Un ciclo (bucle) que procesa cada medicina de la receta
    for (const med of medicamentos) {
       // Buscamos cuánto stock tiene esa medicina actualmente
       const { data: prod } = await supabase.from("productos").select("stock").eq("id", med.producto_id).single();
       
       if (prod) {
         // Descontamos el stock
         await supabase.from("productos").update({ stock: prod.stock - med.cantidad }).eq("id", med.producto_id);
         
         // Registramos la salida en el historial financiero como Donación Municipal
         await supabase.from("ventas").insert([{
            cliente_id: clienteId,
            producto_id: med.producto_id,
            cantidad: med.cantidad,
            tipo_transaccion: 'Donación',
            total: 0,
            receta_medica: `Receta Electrónica #${recetaId.split('-')[0].toUpperCase()}`
         }]);
       }
    }

    revalidatePath("/kore/ventas");
    revalidatePath("/kore/productos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}