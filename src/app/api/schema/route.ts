import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Consulta de columnas (desarrollo)
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('ventas').select('*').limit(1);
  return NextResponse.json({
    keys: data && data.length > 0 ? Object.keys(data[0]) : [],
    error
  });
}
