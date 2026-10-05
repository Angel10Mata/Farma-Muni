import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Guardar suscripción push del navegador
export async function POST(req: Request) {
  if (process.env.APP_ENV !== 'production') {
    return NextResponse.json({ error: 'Push notifications are disabled in non-production environments.' }, { status: 503 })
  }
  try {
    const { subscription, userId } = await req.json();
    const supabase = await createClient();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Missing subscription endpoint" }, { status: 400 });
    }

    // Borrar suscripción anterior con el mismo endpoint (si existe)
    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);

    // Insertar la nueva suscripción
    const { error } = await supabase.from("push_subscriptions").insert({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_id: userId,
    });

    if (error) {
      console.error("Subscription Error: ", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.APP_ENV !== 'production') {
    return NextResponse.json({ error: 'Push notifications are disabled in non-production environments.' }, { status: 503 })
  }
  try {
    const { endpoint } = await req.json();
    const supabase = await createClient();

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

    if (error) {
      console.error("Delete Subscription Error: ", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
