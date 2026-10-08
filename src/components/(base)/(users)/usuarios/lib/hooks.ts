import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Consultas
export function useUsers(userRole?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["users-list", userRole],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, nombre, rol")
        .order("nombre", { ascending: true });

      if (userRole === "super") {
      } else if (userRole === "admin") {
        query = query.neq("rol", "super");
      } else {
        query = query.eq("rol", "user");
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;
    },
    enabled: !!userRole,
  });
}
