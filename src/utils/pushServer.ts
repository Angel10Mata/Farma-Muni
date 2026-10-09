import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// CONFIG VAPID Y CLIENTE ADMIN
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '';

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    'mailto:contacto@kore.com', // Cambiar por tu correo
    publicVapidKey,
    privateVapidKey
  );
}

// Cliente de Supabase Admin (para leer la BD sin restricciones de RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

const supabaseAdmin = supabaseServiceRole
  ? createClient(supabaseUrl, supabaseServiceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

// ENVÍO PUSH POR ROLES

export async function sendPushNotification(
  payload: { title: string; body: string; icon?: string; url?: string },
  targetRoles: string[] = ['all']
) {
  try {
    if (!supabaseAdmin) {
      console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY no configurada. Saltando push.");
      return;
    }

    if (!publicVapidKey || !privateVapidKey) {
      console.warn('⚠️ No hay llaves VAPID configuradas. Saltando envío de notificaciones.');
      return;
    }

    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id');

    if (error) {
      console.error('Error obteniendo suscripciones:', error);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return; // No hay dispositivos suscritos
    }

    // 2. Si es para roles específicos, necesitamos filtrar
    // Para simplificar, si no es 'all', traemos el metadata de auth para ver los roles
    const allowedUserIds = new Set<string>();

    if (!targetRoles.includes("all")) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, rol")
        .in("rol", targetRoles);

      if (!profilesError && profiles) {
        for (const profile of profiles) {
          allowedUserIds.add(profile.id);
        }
      }
    }

    // 3. Filtrar suscripciones y enviar
    const promises = subscriptions.map(async (sub) => {
      // Validar si el usuario cumple con el rol
      if (!targetRoles.includes('all') && !allowedUserIds.has(sub.user_id)) {
        return; // Saltar este dispositivo
      }

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (err: unknown) {
        const pushErr = err as { statusCode?: number };
        // Si el endpoint expiró (410) o no se encuentra (404), borramos la suscripción
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        } else {
          console.error('Error enviando push a un dispositivo:', err);
        }
      }
    });

    await Promise.all(promises);
    console.log(`✅ Notificación enviada a roles: ${targetRoles.join(', ')}`);

  } catch (error) {
    console.error('Error general enviando notificaciones:', error);
  }
}
