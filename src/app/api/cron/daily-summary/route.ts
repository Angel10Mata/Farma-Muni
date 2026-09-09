import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from '@/utils/pushServer';

export async function GET(request: Request) {
  try {
    // Para seguridad, podrías validar un Header Authorization de tu servicio Cron.
    // Por simplicidad, aquí procesamos directamente.

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const supabase = createClient(supabaseUrl, supabaseServiceRole, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Obtener ventas del día de hoy
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const { data: ventas, error } = await supabase
      .from('ven_ventas')
      .select('total, estado')
      .gte('fecha', startOfDay.toISOString())
      .lte('fecha', endOfDay.toISOString())
      .eq('estado', 'completada');

    if (error) {
      console.error('Error obteniendo ventas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalVentas = ventas?.length || 0;
    const totalIngresos = ventas?.reduce((sum, v) => sum + Number(v.total), 0) || 0;

    // Enviar notificación a Admin y Super
    await sendPushNotification(
      {
        title: '📊 Corte de Caja Diario',
        body: `Se realizaron ${totalVentas} ventas hoy con un total de Q${totalIngresos.toFixed(2)}.`,
        url: '/farmamuni/finanzas' // URL al hacer clic en la notificación
      },
      ['admin', 'super']
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Corte de caja procesado y notificado',
      stats: { totalVentas, totalIngresos }
    });

  } catch (error: any) {
    console.error('Error en el cron de reporte diario:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
