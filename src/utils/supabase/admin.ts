import { createClient } from "@supabase/supabase-js";

// CLIENTE ADMIN (SERVICE ROLE, SERVER)

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
