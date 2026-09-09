"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

export async function authorizeDevice(deviceId: string, friendlyName?: string) {
  const { error } = await supabaseAdmin
    .from("authorized_devices")
    .update({
      is_authorized: true,
      ...(friendlyName ? { friendly_name: friendlyName } : {}),
    })
    .eq("id", deviceId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/farmamuni");
  return { success: true };
}

export async function denyDevice(deviceId: string) {
  const { error } = await supabaseAdmin
    .from("authorized_devices")
    .delete()
    .eq("id", deviceId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/farmamuni");
  return { success: true };
}
