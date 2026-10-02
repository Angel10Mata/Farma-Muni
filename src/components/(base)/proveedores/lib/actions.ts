"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ProveedorInputSchema, ProveedorInput, CompraSchema, CompraInput } from "./zod";

type ActionFail = { success?: false; code: string; detail?: string };

function mapDbError(error: { code?: string; message?: string }): ActionFail {
  const msg = error.message ?? "";
  if (error.code === "23505" || msg.includes("inv_lotes_codigo_barras_unique") || msg.includes("codigo_barras")) {
    return {
      code: "DUPLICATE",
      detail: "Ese código de barras ya existe en otro lote. Usa un código distinto.",
    };
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

export async function obtenerProveedores() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data, error } = await supabase
      .from("inv_proveedores")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) return { code: "INTERNAL" as const };
    return { success: true as const, data: data ?? [] };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function guardarProveedor(id: string | undefined, input: ProveedorInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

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
      const { error } = await supabase.from("inv_proveedores").insert(payload);
      if (error) return { code: "INTERNAL" as const };
    }

    revalidatePath("/farmamuni/proveedores");
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function eliminarProveedor(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { error } = await supabase.from("inv_proveedores").delete().eq("id", id);
    if (error) return { code: "INTERNAL" as const };

    revalidatePath("/farmamuni/proveedores");
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function obtenerProveedoresYProductos() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data: proveedores, error: provError } = await supabase
      .from("inv_proveedores")
      .select("*")
      .order("nombre", { ascending: true });

    if (provError) return { code: "INTERNAL" as const };

    const { data: productos, error: prodError } = await supabase
      .from("inv_productos")
      .select("id, nombre, precio_base, stock_actual, activo, proveedor_id")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (prodError) return { code: "INTERNAL" as const };

    return {
      success: true as const,
      data: { proveedores: proveedores ?? [], productos: productos ?? [] },
    };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function crearCompra(input: CompraInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const parsed = CompraSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const { proveedor_id, total, estado_pago, observaciones, items } = parsed.data;
    const pagado = esEstadoPagado(estado_pago);

    const { data: compra, error: compraError } = await supabase
      .from("inv_compras")
      .insert({
        proveedor_id,
        total,
        estado_pago: pagado ? "Pagado" : estado_pago,
        fecha_pago: pagado ? new Date().toISOString() : null,
        observaciones: observaciones?.trim() || null,
      })
      .select("id")
      .single();

    if (compraError || !compra) {
      return mapDbError(compraError ?? { message: "No se creó la compra." });
    }

    for (const item of items) {
      const { data: detalleRow, error: detalleError } = await supabase
        .from("inv_compras_detalles")
        .insert({
          compra_id: compra.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_costo: item.precio_costo,
          subtotal: item.subtotal,
        })
        .select("id")
        .single();

      if (detalleError || !detalleRow) {
        return mapDbError(detalleError ?? { message: "No se guardó el detalle de compra." });
      }

      const { error: loteError } = await supabase.from("inv_lotes").insert({
        producto_id: item.producto_id,
        compra_detalle_id: detalleRow.id,
        codigo_barras: item.codigo_barras.trim(),
        numero_lote: item.numero_lote.trim(),
        cantidad_inicial: item.cantidad,
        cantidad_actual: item.cantidad,
        precio_costo: item.precio_costo,
        fecha_vencimiento: normalizarFechaLote(item.fecha_vencimiento),
        ubicacion: item.ubicacion?.trim() || null,
        activo: true,
      });

      if (loteError) {
        return mapDbError(loteError);
      }

      const { error: provError } = await supabase
        .from("inv_productos")
        .update({ proveedor_id })
        .eq("id", item.producto_id);

      if (provError) {
        return mapDbError(provError);
      }
    }

    if (pagado) {
      const { error: finError } = await supabase.from("fin_transacciones").insert({
        tipo_movimiento: "egreso",
        categoria: "pago_proveedor",
        monto: total,
        descripcion: `Pago inmediato de compra al registrar`,
        usuario_id: user.id,
        compra_id: compra.id,
      });
      if (finError) {
        return mapDbError(finError);
      }
    }

    revalidatePath("/farmamuni/inventario");
    revalidatePath("/farmamuni/proveedores");
    revalidatePath("/farmamuni/finanzas");

    return { success: true as const, compra_id: compra.id };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error inesperado.";
    return { code: "INTERNAL" as const, detail: message };
  }
}

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
      .select("id, created_at, total, estado_pago, fin_transacciones(id, monto, fecha_movimiento, tipo_movimiento, categoria)")
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
      .select("*, inv_productos(nombre)")
      .eq("compra_id", compraId);

    if (error) return { code: "INTERNAL" as const };
    return { success: true as const, data: data ?? [] };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function actualizarEstadoPagoCompra(compraId: string, nuevoEstado: "Pagado" | "Pendiente") {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data: compra, error: compraErr } = await supabase
      .from("inv_compras")
      .select("total, estado_pago")
      .eq("id", compraId)
      .single();

    if (compraErr) return { code: "INTERNAL" as const };

    if (nuevoEstado === "Pagado" && compra.estado_pago !== "Pagado") {
      const { data: pagos } = await supabase
        .from("fin_transacciones")
        .select("monto")
        .eq("compra_id", compraId)
        .eq("categoria", "pago_proveedor");

      const pagado = pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0;
      const saldo = Number(compra.total) - pagado;

      if (saldo > 0) {
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
      const { data: pagos } = await supabase
        .from("fin_transacciones")
        .select("*")
        .eq("compra_id", compraId)
        .eq("categoria", "pago_proveedor");

      if (pagos && pagos.length > 0) {
        const saldoNeto = pagos.reduce((sum, p) => sum + Number(p.monto), 0);
        if (saldoNeto > 0) {
          const { error: finError } = await supabase.from("fin_transacciones").insert({
            tipo_movimiento: "egreso",
            categoria: "pago_proveedor",
            monto: -Math.abs(saldoNeto),
            descripcion: `Anulación automática al marcar compra como Pendiente`,
            usuario_id: user.id,
            compra_id: compraId,
          });
          if (finError) return { code: "INTERNAL" as const };
        }
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    if (!montoAbono || montoAbono <= 0) return { code: "VALIDATION" as const };

    const { data: compra, error: compraError } = await supabase
      .from("inv_compras")
      .select("*, fin_transacciones(monto, categoria)")
      .eq("id", compraId)
      .single();

    if (compraError || !compra) return { code: "NOT_FOUND" as const };

    const pagado = compra.fin_transacciones
      ?.filter((t: { categoria: string }) => t.categoria === "pago_proveedor")
      .reduce((acc: number, curr: { monto: number }) => acc + Math.abs(Number(curr.monto)), 0) || 0;

    const saldo = Number(compra.total) - pagado;
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

    if (montoAbono >= saldo - 0.01) {
      await supabase
        .from("inv_compras")
        .update({ estado_pago: "Pagado", fecha_pago: new Date().toISOString() })
        .eq("id", compraId);
    }

    revalidatePath("/farmamuni/proveedores");
    revalidatePath("/farmamuni/finanzas");
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}
