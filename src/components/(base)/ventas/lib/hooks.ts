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
  obtenerBitacoraVenta,
  anularVenta,
  editarDetalleVentaDirecto,
  eliminarDetalleVentaDirecto,
  obtenerProductosYClientes,
  listarSolicitudesRebajaPendientes,
  aprobarSolicitudRebaja,
  rechazarSolicitudRebaja,
  obtenerSolicitudRebaja,
  obtenerMiSolicitudRebajaPendiente,
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

export function useBitacoraVenta(ventaId: string | null) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["ventas", "bitacora", ventaId], isDemoMode),
    queryFn: async () => {
      if (!ventaId) return [];
      return await obtenerBitacoraVenta(ventaId);
    },
    enabled: !!ventaId && !isDemoMode,
  });
}

export function useAnularVenta() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { ventaId: string; motivo: string }) => {
      assertWritableDemo(isDemoMode);
      const res = await anularVenta(params.ventaId, params.motivo);
      if (!res.success) throw new Error(res.error ?? "Error al anular");
      return res;
    },
    onSuccess: (_data, variables) => {
      toast.success("Venta anulada correctamente");
      queryClient.invalidateQueries({ queryKey: ["ventas", "historial"] });
      queryClient.invalidateQueries({ queryKey: ["ventas", "bitacora", variables.ventaId] });
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
      motivo: string;
      productoNombre?: string;
    }) => {
      assertWritableDemo(isDemoMode);
      const res = await editarDetalleVentaDirecto(params);
      if (!res.success) throw new Error(res.error ?? "Error al editar");
      return res;
    },
    onSuccess: (_data, variables) => {
      toast.success("Detalle actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["ventas", "detalle"] });
      queryClient.invalidateQueries({ queryKey: ["ventas", "historial"] });
      queryClient.invalidateQueries({ queryKey: ["ventas", "bitacora", variables.ventaId] });
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al editar detalle");
    },
  });
}

export function useMiSolicitudRebajaPendiente(enabled: boolean) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["ventas", "mi-rebaja-pendiente"], isDemoMode),
    queryFn: async () => {
      if (isDemoMode) return null;
      const res = await obtenerMiSolicitudRebajaPendiente();
      if (!res.success) throw new Error(res.error ?? "Error al cargar solicitud");
      return res.solicitud;
    },
    enabled: enabled && !isDemoMode,
  });
}

export function useSolicitudesRebajaPendientes(enabled: boolean) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["ventas", "rebajas-pendientes"], isDemoMode),
    queryFn: async () => {
      if (isDemoMode) return [];
      const res = await listarSolicitudesRebajaPendientes();
      if (!res.success) throw new Error(res.error ?? "Error al cargar solicitudes");
      return res.solicitudes;
    },
    enabled: enabled && !isDemoMode,
  });
}

export function useEstadoSolicitudRebaja(solicitudId: string | null) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["ventas", "rebaja-estado", solicitudId], isDemoMode),
    queryFn: async () => {
      if (!solicitudId) return null;
      const res = await obtenerSolicitudRebaja(solicitudId);
      if (!res.success) throw new Error(res.error ?? "Error");
      return res.solicitud;
    },
    enabled: !!solicitudId && !isDemoMode,
  });
}

export function useAprobarSolicitudRebaja() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (solicitudId: string) => {
      assertWritableDemo(isDemoMode);
      return await aprobarSolicitudRebaja(solicitudId);
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Rebaja autorizada");
        queryClient.invalidateQueries({ queryKey: ["ventas", "rebajas-pendientes"] });
        queryClient.invalidateQueries({ queryKey: ["ventas", "mi-rebaja-pendiente"] });
      } else {
        toast.error(res.error ?? "No se pudo aprobar");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRechazarSolicitudRebaja() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { solicitudId: string; motivo?: string }) => {
      assertWritableDemo(isDemoMode);
      return await rechazarSolicitudRebaja(params.solicitudId, params.motivo);
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Solicitud rechazada");
        queryClient.invalidateQueries({ queryKey: ["ventas", "rebajas-pendientes"] });
        queryClient.invalidateQueries({ queryKey: ["ventas", "mi-rebaja-pendiente"] });
      } else {
        toast.error(res.error ?? "No se pudo rechazar");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
      motivo: string;
      productoNombre?: string;
    }) => {
      assertWritableDemo(isDemoMode);
      const res = await eliminarDetalleVentaDirecto(params);
      if (!res.success) throw new Error(res.error ?? "Error al eliminar");
      return res;
    },
    onSuccess: (_data, variables) => {
      toast.success("Producto eliminado de la venta");
      queryClient.invalidateQueries({ queryKey: ["ventas", "detalle"] });
      queryClient.invalidateQueries({ queryKey: ["ventas", "historial"] });
      queryClient.invalidateQueries({ queryKey: ["ventas", "bitacora", variables.ventaId] });
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar detalle");
    },
  });
}
