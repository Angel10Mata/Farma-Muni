import { QueryClient, type DefaultOptions } from "@tanstack/react-query";

const STALE_MS = 1000 * 60 * 3;
const GC_MS = 1000 * 60 * 30;

export const defaultQueryClientOptions: DefaultOptions = {
  queries: {
    staleTime: STALE_MS,
    gcTime: GC_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
  },
};

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: defaultQueryClientOptions,
  });
}
