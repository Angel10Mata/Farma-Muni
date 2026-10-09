"use server";

import { createClient } from "@/utils/supabase/server";

import type { CreditoResumen, VentaCreditoDetalle } from "./zod";

// Resumen por cliente
export async function obtenerResumenCreditos(): Promise<CreditoResumen[]> {
  try {
    const supabase = await createClient();

    // Clientes
    const { data: clientesData, error: cliError } = await supabase
      .from("ven_clientes")
      .select("*")
      .order("nombre", { ascending: true });

    if (cliError) throw new Error(cliError.message);

    const { data: settingsRow } = await supabase
      .from("app_settings")
      .select("dias_credito")
      .limit(1)
      .maybeSingle();
    const diasCreditoPlazo = Number(settingsRow?.dias_credito) || 30;

    const hoyGt = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Guatemala" }),
    );
    hoyGt.setHours(0, 0, 0, 0);

    const ventasData: Array<{
      id: string;
      cliente_id: string | null;
      total: number | null;
      tipo_venta: string | null;
      created_at: string;
      fecha_credito_vencimiento: string | null;
    }> = [];
    const PAGE = 500;
    let offset = 0;
    while (true) {
      const { data: page, error: ventasError } = await supabase
        .from("ventas")
        .select("id, cliente_id, total, tipo_venta, created_at, fecha_credito_vencimiento, estado")
        .eq("tipo_venta", "Crédito")
        .neq("estado", "anulada")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE - 1);

      if (ventasError) throw new Error(ventasError.message);
      if (!page?.length) break;
      ventasData.push(...page);
      if (page.length < PAGE) break;
      offset += PAGE;
    }

    // Abonos y cargos de esas ventas
    const ventasIds = ventasData ? ventasData.map((v: any) => v.id) : [];
    let transaccionesData: any[] = [];
    
    if (ventasIds.length > 0) {
      // Consultar en lotes
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

    // Agrupar por venta
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
          credito_vencido: false,
          monto_credito_vencido: 0,
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

          const fechaVence = v.fecha_credito_vencimiento
            ? new Date(`${v.fecha_credito_vencimiento}T12:00:00`)
            : new Date(new Date(v.created_at).getTime());
          if (!v.fecha_credito_vencimiento) {
            fechaVence.setDate(fechaVence.getDate() + diasCreditoPlazo);
          }
          fechaVence.setHours(0, 0, 0, 0);
          if (fechaVence < hoyGt) {
            c.credito_vencido = true;
            c.monto_credito_vencido =
              (c.monto_credito_vencido ?? 0) + saldoVenta;
          }
        }
      });
    }

    const resultado: CreditoResumen[] = [];
    clientCreditosMap.forEach((c) => {
      // Solo clientes que alguna vez compraron a crédito
      if (c.total_consumido > 0) {
        if (c.saldo_pendiente <= 0) {
           c.estado = "Solventado";
        } else if (c.credito_vencido || c.dias_atraso > diasCreditoPlazo) {
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

// Historial de un cliente
export async function obtenerDetalleCredito(clienteId: string): Promise<VentaCreditoDetalle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ventas")
    .select("id, created_at, tipo_venta, total, estado, observaciones, fin_transacciones(id, monto, fecha_movimiento, tipo_movimiento, categoria)")
    .eq("cliente_id", clienteId)
    .eq("tipo_venta", "Crédito")
    .neq("estado", "anulada")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}
