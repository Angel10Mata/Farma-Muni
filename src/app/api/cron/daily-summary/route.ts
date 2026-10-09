import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendPushNotification } from "@/utils/pushServer";
import { assertCronAuthorized } from "@/lib/api-cron-auth";
import { obtenerResumenLotesVencimiento } from "@/lib/resumen-lotes-vencimiento";

export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) {
    return denied;
  }

  try {
    const supabase = createAdminClient();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const { data: ventasRaw, error } = await supabase
      .from("ventas")
      .select("total, estado")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString());

    if (error) {
      console.error("Error obteniendo ventas:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const ventas = (ventasRaw ?? []).filter(
      (v) => (v.estado ?? "activa") !== "anulada",
    );

    const totalVentas = ventas.length;
    const totalIngresos = ventas.reduce((sum, v) => sum + Number(v.total), 0);

    let lotesPorVencer30 = 0;
    try {
      const venc = await obtenerResumenLotesVencimiento(supabase);
      lotesPorVencer30 = venc.lotesPorVencer30;
    } catch (vencErr) {
      console.error("Error resumen vencimientos:", vencErr);
    }

    const parteVenc =
      lotesPorVencer30 > 0
        ? ` ${lotesPorVencer30} lote(s) vencen en los próximos 30 días.`
        : "";

    await sendPushNotification(
      {
        title: "📊 Corte de Caja Diario",
        body: `Se realizaron ${totalVentas} ventas hoy con un total de Q${totalIngresos.toFixed(2)}.${parteVenc}`,
        url: "/farmamuni/finanzas",
      },
      ["admin", "super"],
    );

    return NextResponse.json({
      success: true,
      message: "Corte de caja procesado y notificado",
      stats: { totalVentas, totalIngresos, lotesPorVencer30 },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    console.error("Error en el cron de reporte diario:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
