import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/general-modal";
import {
  obtenerHistorialVentas,
  obtenerDetalleVenta,
  anularVenta,
  editarDetalleVentaDirecto,
  eliminarDetalleVentaDirecto,
  obtenerProductosYClientes
} from "./actions";

export function useDatosVentas() {
  return useQuery({
    queryKey: ["ventas", "pos-data"],
    queryFn: async () => await obtenerProductosYClientes(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useHistorialVentas() {
  return useQuery({
    queryKey: ["ventas", "historial"],
    queryFn: async () => await obtenerHistorialVentas(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useDetalleVenta(ventaId: string | null) {
  return useQuery({
    queryKey: ["ventas", "detalle", ventaId],
    queryFn: async () => {
      if (!ventaId) return [];
      return await obtenerDetalleVenta(ventaId);
    },
    enabled: !!ventaId,
  });
}

export function useAnularVenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ventaId: string) => {
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
    }
  });
}

export function useEditarDetalleVenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      detalleId: string,
      ventaId: string,
      productoId: string,
      nuevaCantidad: number,
      nuevoPrecio: number
    }) => {
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
    }
  });
}

export function useEliminarDetalleVenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { detalleId: string, ventaId: string, productoId: string, cantidadADevolver: number }) => {
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
    }
  });
}
