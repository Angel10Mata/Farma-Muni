"use server";

import { createClient } from "@/utils/supabase/server";
import { Producto, Cliente } from "./zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { sendPushNotification } from "@/utils/pushServer";

export interface ItemVentaInput {
  producto_id: string;
  cantidad: number;
  precio_aplicado: number;
  subtotal: number;
}

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

export async function crearVenta(params: {
  cliente_id: string | null;
  tipo_venta: string;
  total: number;
  observaciones: string | null;
  items: ItemVentaInput[];
}) {
  try {
    const supabase = await createClient();
    
    // Obtener usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesión no válida o expirada.");

    const { cliente_id, tipo_venta, total, observaciones, items } = params;

    if (!items || items.length === 0) {
      throw new Error("La venta debe contener al menos un producto.");
    }

    // 1. Validar existencias de stock en el servidor para evitar sobreventas
    for (const item of items) {
      const { data: prod, error: findError } = await supabase
        .from("inv_productos")
        .select("nombre, stock_actual")
        .eq("id", item.producto_id)
        .single();
      
      if (findError || !prod) {
        throw new Error(`Producto con ID ${item.producto_id} no encontrado.`);
      }

      if (prod.stock_actual < item.cantidad) {
        throw new Error(`Stock insuficiente para ${prod.nombre} (Disponibles: ${prod.stock_actual}, Solicitados: ${item.cantidad}).`);
      }
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
    const detalles = items.map((item) => ({
      venta_id: venta.id,
      producto_id: item.producto_id,
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

    // 4. Descontar las existencias del inventario
    for (const item of items) {
      const { data: prod } = await supabase
        .from("inv_productos")
        .select("nombre, stock_actual, stock_minimo")
        .eq("id", item.producto_id)
        .single();

      const nuevoStock = (prod?.stock_actual || 0) - item.cantidad;

      const { error: stockError } = await supabase
        .from("inv_productos")
        .update({ stock_actual: nuevoStock })
        .eq("id", item.producto_id);

      if (stockError) {
        throw new Error(`Error al actualizar el stock del producto ID ${item.producto_id}: ${stockError.message}`);
      }

      // Enviar notificación si cae por debajo del mínimo (o igual)
      if (prod && nuevoStock <= prod.stock_minimo) {
        await sendPushNotification(
          {
            title: '⚠️ Alerta de Inventario',
            body: `El producto "${prod.nombre}" ha llegado a su stock mínimo (${nuevoStock} unidades restantes).`,
            url: '/farmacia-la-salud/inventario'
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

    // Revalidar rutas para refrescar cache
    revalidatePath("/farmacia-la-salud/inventario");
    revalidatePath("/farmacia-la-salud/ventas");
    revalidatePath("/farmacia-la-salud/finanzas");

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

export async function obtenerHistorialVentas() {
  try {
    const supabase = await createClient();

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

export async function obtenerDetalleVenta(ventaId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("ven_detalles")
      .select("*, inv_productos(nombre, codigo)")
      .eq("venta_id", ventaId);

    if (error) throw new Error(error.message);

    return data || [];
  } catch (error: any) {
    console.error("Error en obtenerDetalleVenta:", error);
    throw new Error("No se pudo obtener el detalle de la venta.");
  }
}

export async function anularVenta(ventaId: string) {
  try {
    const supabase = await createClient();

    // 1. Obtener detalles de la venta (productos y cantidades)
    const { data: detalles, error: detError } = await supabase
      .from("ven_detalles")
      .select("producto_id, cantidad")
      .eq("venta_id", ventaId);

    if (detError) throw new Error(detError.message);

    // 2. Devolver las cantidades al stock en inv_productos
    if (detalles && detalles.length > 0) {
      for (const item of detalles) {
        const { data: prod, error: prodError } = await supabase
          .from("inv_productos")
          .select("stock_actual")
          .eq("id", item.producto_id)
          .single();

        if (!prodError && prod) {
          const nuevoStock = prod.stock_actual + item.cantidad;
          await supabase
            .from("inv_productos")
            .update({ stock_actual: nuevoStock })
            .eq("id", item.producto_id);
        }
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

    // Revalidar rutas para refrescar cache de inventario, ventas y finanzas
    revalidatePath("/farmacia-la-salud/inventario");
    revalidatePath("/farmacia-la-salud/ventas");
    revalidatePath("/farmacia-la-salud/finanzas");

    return { success: true };
  } catch (error: any) {
    console.error("Error en anularVenta:", error);
    return {
      success: false,
      error: error.message || "Error al anular la venta."
    };
  }
}

export async function editarDetalleVentaDirecto(params: {
  detalleId: string;
  ventaId: string;
  productoId: string;
  nuevaCantidad: number;
  nuevoPrecio: number;
}) {
  try {
    const supabase = await createClient();
    const { detalleId, ventaId, productoId, nuevaCantidad, nuevoPrecio } = params;

    // 1. Obtener la cantidad anterior del detalle para calcular la diferencia de stock
    const { data: detAnterior, error: getDetError } = await supabase
      .from("ven_detalles")
      .select("cantidad")
      .eq("id", detalleId)
      .single();

    if (getDetError || !detAnterior) {
      throw new Error("No se encontró el detalle de la venta anterior.");
    }

    const cantidadAnterior = detAnterior.cantidad;
    const diffCantidad = nuevaCantidad - cantidadAnterior; // Si aumenta, descontamos más stock. Si disminuye, devolvemos stock.

    // 2. Si aumentó la cantidad, verificar que haya stock disponible en inv_productos
    if (diffCantidad > 0) {
      const { data: prod, error: getProdError } = await supabase
        .from("inv_productos")
        .select("nombre, stock_actual")
        .eq("id", productoId)
        .single();

      if (getProdError || !prod) {
        throw new Error("Producto no encontrado.");
      }

      if (prod.stock_actual < diffCantidad) {
        throw new Error(`Stock insuficiente para aumentar la cantidad. Disponibles: ${prod.stock_actual}.`);
      }
    }

    // 3. Actualizar el stock del producto
    const { data: prodStock } = await supabase
      .from("inv_productos")
      .select("stock_actual")
      .eq("id", productoId)
      .single();

    const nuevoStock = (prodStock?.stock_actual || 0) - diffCantidad;

    const { error: stockError } = await supabase
      .from("inv_productos")
      .update({ stock_actual: nuevoStock })
      .eq("id", productoId);

    if (stockError) {
      throw new Error(`Error al actualizar el stock: ${stockError.message}`);
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
}) {
  try {
    const supabase = await createClient();
    const { detalleId, ventaId, productoId, cantidadADevolver } = params;

    // 1. Obtener el stock actual del producto para sumarle la cantidad devuelta
    const { data: prod, error: getProdError } = await supabase
      .from("inv_productos")
      .select("stock_actual")
      .eq("id", productoId)
      .single();

    if (getProdError || !prod) {
      throw new Error("No se pudo obtener el stock del producto.");
    }

    const nuevoStock = prod.stock_actual + cantidadADevolver;

    // 2. Actualizar el stock del producto
    const { error: updateStockError } = await supabase
      .from("inv_productos")
      .update({ stock_actual: nuevoStock })
      .eq("id", productoId);

    if (updateStockError) {
      throw new Error(`Error al devolver stock al inventario: ${updateStockError.message}`);
    }

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
        url: '/farmacia-la-salud/ventas'
      },
      ['admin', 'super']
    );

    return { success: true, nuevoTotal: nuevoTotalVenta };
  } catch (error: any) {
    console.error("Error en eliminarDetalleVentaDirecto:", error);
    return { success: false, error: error.message || "Error al eliminar el producto de la venta." };
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
