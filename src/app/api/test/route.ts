import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-session";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const session = await requireApiAdmin();
  if (!session.ok) {
    return session.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fin_transacciones")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
