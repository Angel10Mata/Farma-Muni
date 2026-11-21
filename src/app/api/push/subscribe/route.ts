import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-session";

export async function POST(req: Request) {
  if (process.env.APP_ENV !== "production") {
    return NextResponse.json(
      { error: "Push notifications are disabled in non-production environments." },
      { status: 503 },
    );
  }

  const session = await requireApiSession();
  if (!session.ok) {
    return session.response;
  }

  try {
    const { subscription } = (await req.json()) as {
      subscription?: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      userId?: string;
    };

    const { supabase, user } = session;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Missing subscription endpoint" }, { status: 400 });
    }

    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);

    const { error } = await supabase.from("push_subscriptions").insert({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_id: user.id,
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
  if (process.env.APP_ENV !== "production") {
    return NextResponse.json(
      { error: "Push notifications are disabled in non-production environments." },
      { status: 503 },
    );
  }

  const session = await requireApiSession();
  if (!session.ok) {
    return session.response;
  }

  try {
    const { endpoint } = (await req.json()) as { endpoint?: string };
    const { supabase, user } = session;

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("user_id", user.id);

    if (error) {
      console.error("Delete Subscription Error: ", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
