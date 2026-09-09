import { useQuery } from "@tanstack/react-query";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import {
  DEMO_CREDITO_DETALLE,
  DEMO_CREDITOS_RESUMEN,
  DEMO_VENTAS_HISTORIAL,
} from "@/lib/demo/fixtures";
import { demoQueryKey, resolveDemoData } from "@/lib/demo/helpers";
import { obtenerResumenCreditos, obtenerDetalleCredito } from "./actions";
import type { CreditoResumen, VentaCreditoDetalle } from "./zod";

export function useResumenCreditos() {
  const { isDemoMode } = useDemoMode();
  return useQuery<CreditoResumen[]>({
    queryKey: demoQueryKey(["creditos", "resumen"], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        () => obtenerResumenCreditos(),
        DEMO_CREDITOS_RESUMEN,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDetalleCredito(clienteId: string | undefined) {
  const { isDemoMode } = useDemoMode();
  return useQuery<VentaCreditoDetalle[]>({
    queryKey: demoQueryKey(["creditos", "detalle", clienteId], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          if (!clienteId) return [];
          return await obtenerDetalleCredito(clienteId);
        },
        DEMO_CREDITO_DETALLE.filter(
          (v) =>
            DEMO_VENTAS_HISTORIAL.find(
              (h) => h.id === v.id && h.cliente_id === clienteId,
            ),
        ),
      ),
    enabled: !!clienteId,
  });
}
