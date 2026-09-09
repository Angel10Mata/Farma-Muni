import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from '@/utils/pushServer';

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const supabase = createClient(supabaseUrl, supabaseServiceRole, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Buscar gastos fijos (como recordatorios) que estén próximos a vencer en los siguientes 3 días
    // Asumiendo que fin_gastos_fijos tiene algo como 'dia_vencimiento' (número del 1 al 31)
    
    // Obtener el día actual y el día de vencimiento + 3 días
    const today = new Date();
    const currentDay = today.getDate();
    const upcomingDays = [currentDay, (currentDay + 1) % 31 || 31, (currentDay + 2) % 31 || 31];

    const { data: gastos, error } = await supabase
      .from('fin_gastos_fijos')
      .select('nombre, dia_vencimiento, monto')
      .in('dia_vencimiento', upcomingDays);

    if (error) {
      console.error('Error obteniendo gastos fijos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (gastos && gastos.length > 0) {
      const gastosMensaje = gastos.map(g => `${g.nombre} (Día ${g.dia_vencimiento})`).join(', ');
      
      // Enviar notificación a Admin y Super
      await sendPushNotification(
        {
          title: '⚠️ Recordatorio Financiero',
          body: `Tienes ${gastos.length} cuenta(s) por pagar próxima(s) a vencer: ${gastosMensaje}.`,
          url: '/farmamuni/finanzas'
        },
        ['admin', 'super']
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Recordatorios financieros procesados',
      encontrados: gastos?.length || 0
    });

  } catch (error: any) {
    console.error('Error en el cron de recordatorios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
