import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Prueba de lectura finanzas
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("fin_transacciones").select("*").order("created_at", { ascending: false }).limit(20);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}
