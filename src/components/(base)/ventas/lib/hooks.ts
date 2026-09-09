import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/general-modal";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import {
  DEMO_VENTA_DETALLE,
  DEMO_VENTAS_HISTORIAL,
  demoProductosPos,
} from "@/lib/demo/fixtures";
import {
  assertWritableDemo,
  demoQueryKey,
  resolveDemoData,
} from "@/lib/demo/helpers";
import {
  obtenerHistorialVentas,
  obtenerDetalleVenta,
  anularVenta,
  editarDetalleVentaDirecto,
  eliminarDetalleVentaDirecto,
  obtenerProductosYClientes,
} from "./actions";

export function useDatosVentas() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["ventas", "pos-data"], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        () => obtenerProductosYClientes(),
        demoProductosPos,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useHistorialVentas() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["ventas", "historial"], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        () => obtenerHistorialVentas(),
        DEMO_VENTAS_HISTORIAL,
      ),
    staleTime: 1000 * 60 * 2,
  });
}

export function useDetalleVenta(ventaId: string | null) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["ventas", "detalle", ventaId], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          if (!ventaId) return [];
          return await obtenerDetalleVenta(ventaId);
        },
        () =>
          DEMO_VENTA_DETALLE.filter((d) => d.venta_id === ventaId),
      ),
    enabled: !!ventaId,
  });
}

export function useAnularVenta() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ventaId: string) => {
      assertWritableDemo(isDemoMode);
      return await anularVenta(ventaId);
    },
    onSuccess: () => {
      toast.success("Venta anulada correctamente");
      queryClient.invalidateQueries({ queryKey: ["ventas", "historial"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas"] });
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al anular la venta");
    },
  });
}

export function useEditarDetalleVenta() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      detalleId: string;
      ventaId: string;
      productoId: string;
      nuevaCantidad: number;
      nuevoPrecio: number;
    }) => {
      assertWritableDemo(isDemoMode);
      return await editarDetalleVentaDirecto(params);
    },
    onSuccess: () => {
      toast.success("Detalle actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["ventas", "detalle"] });
      queryClient.invalidateQueries({ queryKey: ["ventas", "historial"] });
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al editar detalle");
    },
  });
}

export function useEliminarDetalleVenta() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      detalleId: string;
      ventaId: string;
      productoId: string;
      cantidadADevolver: number;
    }) => {
      assertWritableDemo(isDemoMode);
      return await eliminarDetalleVentaDirecto(params);
    },
    onSuccess: () => {
      toast.success("Producto eliminado de la venta");
      queryClient.invalidateQueries({ queryKey: ["ventas", "detalle"] });
      queryClient.invalidateQueries({ queryKey: ["ventas", "historial"] });
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar detalle");
    },
  });
}
