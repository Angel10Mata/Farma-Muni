import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendPushNotification } from "@/utils/pushServer";
import { assertCronAuthorized } from "@/lib/api-cron-auth";

export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) {
    return denied;
  }

  try {
    const supabase = createAdminClient();

    const today = new Date();
    const currentDay = today.getDate();
    const upcomingDays = [
      currentDay,
      (currentDay + 1) % 31 || 31,
      (currentDay + 2) % 31 || 31,
    ];

    const { data: gastos, error } = await supabase
      .from("fin_gastos_fijos")
      .select("nombre, dia_vencimiento, monto")
      .in("dia_vencimiento", upcomingDays);

    if (error) {
      console.error("Error obteniendo gastos fijos:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (gastos && gastos.length > 0) {
      const gastosMensaje = gastos
        .map((g) => `${g.nombre} (Día ${g.dia_vencimiento})`)
        .join(", ");

      await sendPushNotification(
        {
          title: "⚠️ Recordatorio Financiero",
          body: `Tienes ${gastos.length} cuenta(s) por pagar próxima(s) a vencer: ${gastosMensaje}.`,
          url: "/farmamuni/finanzas",
        },
        ["admin", "super"],
      );
    }

    return NextResponse.json({
      success: true,
      message: "Recordatorios financieros procesados",
      encontrados: gastos?.length || 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    console.error("Error en el cron de recordatorios:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
