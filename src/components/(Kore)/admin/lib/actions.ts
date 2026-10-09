"use server";

import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { requireSuper } from "@/lib/auth-guards";

// Dispositivos pendientes de autorizar
export async function getPendingDevicesCount() {
  try {
    const guard = await requireSuper();
    if (!guard.ok) {
      return 0;
    }
    const supabase = guard.supabase;
    const { count } = await supabase
      .from("authorized_devices")
      .select("*", { count: "exact", head: true })
      .eq("is_authorized", false);

    return count || 0;
  } catch (error) {
    unstable_rethrow(error);
    return 0;
  }
}
