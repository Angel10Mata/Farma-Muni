"use server";

import { createClient } from "@/utils/supabase/server";

// Dispositivos pendientes de autorizar
export async function getPendingDevicesCount() {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("authorized_devices")
      .select("*", { count: "exact", head: true })
      .eq("is_authorized", false);

    return count || 0;
  } catch (error) {
    console.error("Error getting pending devices count:", error);
    return 0;
  }
}
