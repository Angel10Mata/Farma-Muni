import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { crearProductoAction } from "./actions";

export function useProductos() {
  return useQuery({
    queryKey: ["productos"],
    queryFn: async () => {
        // Aquí iría la lógica para obtener productos de Supabase
    },
    staleTime: 1000 * 60 * 5, // Regla de caché de 5 minutos
  });
}

export function useCrearProducto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearProductoAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
}