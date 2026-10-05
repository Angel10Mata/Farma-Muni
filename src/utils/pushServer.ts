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
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ENVÍO PUSH POR ROLES

export async function sendPushNotification(
  payload: { title: string; body: string; icon?: string; url?: string },
  targetRoles: string[] = ['all']
) {
  try {
    if (!publicVapidKey || !privateVapidKey) {
      console.warn('⚠️ No hay llaves VAPID configuradas. Saltando envío de notificaciones.');
      return;
    }

    // 1. Obtener todas las suscripciones
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
    let allowedUserIds = new Set<string>();
    
    if (!targetRoles.includes('all')) {
      const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      if (!usersError && usersData?.users) {
        usersData.users.forEach(user => {
          const role = user.user_metadata?.role || 'user';
          if (targetRoles.includes(role)) {
            allowedUserIds.add(user.id);
          }
        });
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
      } catch (err: any) {
        // Si el endpoint expiró (410) o no se encuentra (404), borramos la suscripción
        if (err.statusCode === 410 || err.statusCode === 404) {
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
