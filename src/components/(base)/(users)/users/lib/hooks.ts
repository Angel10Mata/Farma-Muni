import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
      } else if (userRole === "rrhh") {
        query = query.in("rol", ["rrhh", "user"]);
      } else {
        query = query.eq("id", "00000000-0000-0000-0000-000000000000");
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !!userRole,
  });
}
