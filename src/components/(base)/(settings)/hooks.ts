import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppSettings, getMargenesPrecio, updateAppSettings } from "./actions";
import { AppSettingsUpdate, type MargenesPrecio } from "./zod";

// Consultas
export const useAppSettings = () => {
  return useQuery<AppSettingsUpdate | null, Error>({
    queryKey: ["appSettings"],
    queryFn: async () => {
      const data = await getAppSettings();
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export function useMargenesPrecio() {
  return useQuery<MargenesPrecio, Error>({
    queryKey: ["margenesPrecio"],
    queryFn: () => getMargenesPrecio(),
    staleTime: 1000 * 60 * 5,
  });
}

// Mutaciones
export const useUpdateAppSettings = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, AppSettingsUpdate>({
    mutationFn: async (settings: AppSettingsUpdate) => {
      await updateAppSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      queryClient.invalidateQueries({ queryKey: ["margenesPrecio"] });
    },
  });
};