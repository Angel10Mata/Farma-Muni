import webpush from "web-push";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/user-role";
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
    const body = (await req.json()) as {
      title?: string;
      body?: string;
      url?: string;
      userId?: string;
      broadcast?: boolean;
    };

    const { title, body: messageBody, url, userId: bodyUserId, broadcast } = body;
    const { supabase, user, role } = session;
    const isAdmin = isAdminRole(role);

    if (broadcast && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (bodyUserId && bodyUserId !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    webpush.setVapidDetails(
      "mailto:soporte@cermad.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
      process.env.VAPID_PRIVATE_KEY as string,
    );

    let query = supabase.from("push_subscriptions").select("*");

    if (broadcast && isAdmin) {
      // todas las suscripciones
    } else {
      const targetUserId = bodyUserId && isAdmin ? bodyUserId : user.id;
      query = query.eq("user_id", targetUserId);
    }

    const { data: subscriptions, error } = await query;
    if (error) {
      console.error("Error fetching subscriptions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "No subscriptions found" });
    }

    const payload = JSON.stringify({
      title: title || "Nueva Notificación",
      body: messageBody || "Tienes un nuevo mensaje",
      url: url || "/",
      icon: "/icon-192x192.png",
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err: unknown) {
        if (
          (err as { statusCode?: number }).statusCode === 410 ||
          (err as { statusCode?: number }).statusCode === 404
        ) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Error sending push to endpoint", sub.id, err);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({
      success: true,
      message: `Notifications sent to ${subscriptions.length} devices.`,
    });
  } catch (err: unknown) {
    console.error("Push Error: ", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
