import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppSettings, updateAppSettings } from "./actions";
import { AppSettingsUpdate } from "./zod";

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

// Mutaciones
export const useUpdateAppSettings = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, AppSettingsUpdate>({
    mutationFn: async (settings: AppSettingsUpdate) => {
      await updateAppSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
    },
  });
};