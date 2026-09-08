import { createClient as createAdminClient } from "@supabase/supabase-js";
import { AlertCircle } from "lucide-react";
import { AcordeonDispositivos } from "./AcordeonDispositivos";

interface Device {
  id: string;
  user_id: string;
  device_name: string;
  friendly_name?: string | null;
  is_authorized: boolean;
  created_at: string;
}

export async function VerDispositivos() {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );

  const { data: devicesData, error: devicesError } = await supabaseAdmin
    .from("authorized_devices")
    .select("*")
    .order("created_at", { ascending: false });

  if (devicesError) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive text-xs font-bold flex items-center gap-2">
        <AlertCircle className="size-4" /> Error: {devicesError.message}
      </div>
    );
  }

  const devices = (devicesData as Device[]) || [];

  // Fetch user profiles
  const userIds = [...new Set(devices.map((d) => d.user_id))];
  const profiles: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: profilesData } = await supabaseAdmin
      .from("profiles")
      .select("id, nombre")
      .in("id", userIds);

    if (profilesData) {
      profilesData.forEach((p) => {
        profiles[p.id] = p.nombre || "Sin nombre";
      });
    }
  }

  // Group devices by user
  const groupMap = new Map<string, { user_id: string; name: string; devices: Device[] }>();
  for (const dev of devices) {
    if (!groupMap.has(dev.user_id)) {
      groupMap.set(dev.user_id, {
        user_id: dev.user_id,
        name: profiles[dev.user_id] || "Sin nombre",
        devices: [],
      });
    }
    groupMap.get(dev.user_id)!.devices.push(dev);
  }

  // Sort groups: those with pending devices first
  const groups = [...groupMap.values()].sort((a, b) => {
    const aPending = a.devices.filter((d) => !d.is_authorized).length;
    const bPending = b.devices.filter((d) => !d.is_authorized).length;
    return bPending - aPending;
  });

  return (
    <div className="w-full p-4 md:p-6 pt-32 md:pt-28">
      <AcordeonDispositivos groups={groups} />
    </div>
  );
}
