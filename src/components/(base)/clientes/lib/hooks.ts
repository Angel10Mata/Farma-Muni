import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import {
  DEMO_CLIENTES,
  DEMO_VENTAS_HISTORIAL,
} from "@/lib/demo/fixtures";
import {
  assertWritableDemo,
  demoQueryKey,
  resolveDemoData,
} from "@/lib/demo/helpers";
import { obtenerClientes, obtenerVentasCliente, crearCliente, editarCliente } from "./actions";
import { ClienteInput } from "./zod";

export function useClientes() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["clientes"], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          const res = await obtenerClientes();
          if (!res.success) throw new Error(res.code);
          return res.data;
        },
        DEMO_CLIENTES,
      ),
  });
}

export function useVentasCliente(clienteId: string | null) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["ventas-cliente", clienteId], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          if (!clienteId) return [];
          const res = await obtenerVentasCliente(clienteId);
          if (!res.success) throw new Error(res.code);
          return res.data;
        },
        DEMO_VENTAS_HISTORIAL.filter((v) => v.cliente_id === clienteId).map(
          (v) => ({
            id: v.id,
            created_at: v.created_at,
            tipo_venta: v.tipo_venta,
            total: v.total,
            observaciones: v.observaciones,
            fin_transacciones: [] as {
              id: string;
              monto: number;
              fecha_movimiento: string;
              tipo_movimiento: string;
              categoria: string;
            }[],
          }),
        ),
      ),
    enabled: !!clienteId,
  });
}

export function useCrearCliente() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ClienteInput) => {
      assertWritableDemo(isDemoMode);
      const res = await crearCliente(data);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useEditarCliente() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClienteInput }) => {
      assertWritableDemo(isDemoMode);
      const res = await editarCliente(id, data);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
