"use server";

import { createClient } from "@/utils/supabase/server";
import { ClienteSchema, ClienteInput } from "./zod";
import { revalidatePath } from "next/cache";

export async function obtenerClientes() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data: clientesData, error: cliError } = await supabase
      .from("ven_clientes")
      .select("*")
      .order("nombre", { ascending: true });

    if (cliError) return { code: "INTERNAL" as const };

    const { data: ventasData } = await supabase
      .from("ventas")
      .select("id, cliente_id, total, tipo_venta, created_at")
      .not("cliente_id", "is", null);

    const { data: cuentasPendientes } = await supabase.rpc("fin_cuentas_por_cobrar");

    const clientSalesMap = new Map<string, { count: number; lastDate: string }>();
    if (ventasData) {
      for (const v of ventasData) {
        if (!v.cliente_id) continue;
        const existing = clientSalesMap.get(v.cliente_id);
        if (existing) {
          existing.count++;
          if (v.created_at > existing.lastDate) existing.lastDate = v.created_at;
        } else {
          clientSalesMap.set(v.cliente_id, { count: 1, lastDate: v.created_at });
        }
      }
    }

    const clientes = (clientesData ?? []).map((row: Record<string, unknown>) => {
      const sales = clientSalesMap.get(row.id as string);
      const creditosPendientes = cuentasPendientes
        ? (cuentasPendientes as Array<{ cliente_id: string }>).filter(
            (c) => c.cliente_id === row.id
          ).length
        : 0;

      return {
        id: row.id as string,
        nombre: (row.nombre as string) || "Cliente sin nombre",
        email: (row.email as string) || "No registrado",
        telefono: (row.telefono as string) || "No registrado",
        direccion: (row.direccion as string) || "No registrada",
        nit: (row.nit as string) || "C/F",
        totalCompras: sales?.count ?? 0,
        ultimaCompra: sales?.lastDate ?? "",
        saldo: 0,
        creditosPendientes,
        activo: true,
      };
    });

    return { success: true as const, data: clientes };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function obtenerVentasCliente(clienteId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const { data, error } = await supabase
      .from("ventas")
      .select("id, created_at, tipo_venta, total, observaciones, fin_transacciones(id, monto, fecha_movimiento, tipo_movimiento, categoria)")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });

    if (error) return { code: "INTERNAL" as const };

    return { success: true as const, data: data ?? [] };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function crearCliente(input: ClienteInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const parsed = ClienteSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const { error } = await supabase.from("ven_clientes").insert({
      nombre: parsed.data.nombre,
      email: parsed.data.email || null,
      telefono: parsed.data.telefono || null,
      direccion: parsed.data.direccion || null,
      nit: parsed.data.nit || null,
    });

    if (error) return { code: "INTERNAL" as const };

    revalidatePath("/farmamuni/clientes");
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function editarCliente(id: string, input: ClienteInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "UNAUTHORIZED" as const };

    const parsed = ClienteSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const { error } = await supabase
      .from("ven_clientes")
      .update({
        nombre: parsed.data.nombre,
        email: parsed.data.email || null,
        telefono: parsed.data.telefono || null,
        direccion: parsed.data.direccion || null,
        nit: parsed.data.nit || null,
      })
      .eq("id", id);

    if (error) return { code: "INTERNAL" as const };

    revalidatePath("/farmamuni/clientes");
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}
