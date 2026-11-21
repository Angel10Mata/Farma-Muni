import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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
  const { data, error } = await supabase.from("ventas").select("*").limit(1);
  return NextResponse.json({
    keys: data && data.length > 0 ? Object.keys(data[0]) : [],
    error,
  });
}
