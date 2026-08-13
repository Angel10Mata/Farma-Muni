"use server";

import { createClient } from "@/utils/supabase/server";

import type { CreditoResumen, VentaCreditoDetalle } from "./zod";

export async function obtenerResumenCreditos(): Promise<CreditoResumen[]> {
  try {
    const supabase = await createClient();

    // 1. Get all clients
    const { data: clientesData, error: cliError } = await supabase
      .from("ven_clientes")
      .select("*")
      .order("nombre", { ascending: true });

    if (cliError) throw new Error(cliError.message);

    // 2. Get all credit sales (without nested join to avoid timeout)
    const { data: ventasData, error: ventasError } = await supabase
      .from("ventas")
      .select("id, cliente_id, total, tipo_venta, created_at")
      .eq("tipo_venta", "Crédito")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (ventasError) throw new Error(ventasError.message);

    // 3. Get all transactions related to those sales (abonos and ventas)
    const ventasIds = ventasData ? ventasData.map((v: any) => v.id) : [];
    let transaccionesData: any[] = [];
    
    if (ventasIds.length > 0) {
      // Chunk the IDs to avoid URL too long / query size limits
      const CHUNK_SIZE = 200;
      for (let i = 0; i < ventasIds.length; i += CHUNK_SIZE) {
        const chunk = ventasIds.slice(i, i + CHUNK_SIZE);
        const { data: chunkData, error: chunkError } = await supabase
          .from("fin_transacciones")
          .select("venta_id, monto, categoria, fecha_movimiento")
          .in("venta_id", chunk)
          .in("categoria", ["abono_cliente", "venta"]);

        if (chunkError) throw new Error(chunkError.message);
        if (chunkData) {
          transaccionesData = [...transaccionesData, ...chunkData];
        }
      }
    }

    // Group transactions by venta_id for quick lookup
    const transaccionesPorVenta = new Map<string, any[]>();
    if (transaccionesData) {
      for (const t of transaccionesData) {
        if (!t.venta_id) continue;
        const current = transaccionesPorVenta.get(t.venta_id) || [];
        current.push(t);
        transaccionesPorVenta.set(t.venta_id, current);
      }
    }

    const clientCreditosMap = new Map<string, CreditoResumen>();

    if (clientesData) {
      clientesData.forEach((row: any) => {
        clientCreditosMap.set(row.id, {
          cliente_id: row.id,
          nombre: row.nombre || "Cliente sin nombre",
          nit: row.nit || "C/F",
          limite_credito: "N/A",
          total_consumido: 0,
          saldo_pendiente: 0,
          estado: "Solventado",
          dias_atraso: 0,
        });
      });
    }

    if (ventasData) {
      const now = new Date().getTime();
      ventasData.forEach((v: any) => {
        if (!v.cliente_id) return;
        const c = clientCreditosMap.get(v.cliente_id);
        if (!c) return;

        c.total_consumido += v.total || 0;

        const transacciones = transaccionesPorVenta.get(v.id) || [];
        const abonos = transacciones.reduce((sum: number, t: any) => sum + Number(t.monto), 0);

        const saldoVenta = Math.max(0, (v.total || 0) - abonos);
        c.saldo_pendiente += saldoVenta;

        if (saldoVenta > 0) {
          const dias = Math.floor((now - new Date(v.created_at).getTime()) / (1000 * 3600 * 24));
          if (dias > c.dias_atraso) {
             c.dias_atraso = dias;
          }
        }
      });
    }

    const resultado: CreditoResumen[] = [];
    clientCreditosMap.forEach((c) => {
      // Only include clients who have consumed credit at some point
      if (c.total_consumido > 0) {
        if (c.saldo_pendiente <= 0) {
           c.estado = "Solventado";
        } else if (c.dias_atraso > 30) {
           c.estado = "Atrasado";
        } else {
           c.estado = "Al día";
        }
        resultado.push(c);
      }
    });

    return resultado;
  } catch (error: any) {
    console.error("Error en obtenerResumenCreditos:", error);
    throw new Error("No se pudieron cargar los créditos.");
  }
}

export async function obtenerDetalleCredito(clienteId: string): Promise<VentaCreditoDetalle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ventas")
    .select("id, created_at, tipo_venta, total, observaciones, fin_transacciones(id, monto, fecha_movimiento, tipo_movimiento, categoria)")
    .eq("cliente_id", clienteId)
    .eq("tipo_venta", "Crédito")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}
