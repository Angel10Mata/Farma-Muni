import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import {
  DEMO_COMPRA_DETALLE,
  DEMO_COMPRAS,
  DEMO_PROVEEDORES,
  demoProveedoresYProductos,
} from "@/lib/demo/fixtures";
import {
  assertWritableDemo,
  demoQueryKey,
  resolveDemoData,
} from "@/lib/demo/helpers";
import {
  obtenerProveedores,
  guardarProveedor,
  eliminarProveedor,
  obtenerProveedoresYProductos,
  crearCompra,
  obtenerHistorialCompras,
  obtenerDetalleCompra,
  actualizarEstadoPagoCompra,
  registrarAbonoCompra,
  obtenerComprasProveedor,
} from "./actions";
import { ProveedorInput, CompraInput } from "./zod";

export function useProveedores() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["proveedores"], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          const res = await obtenerProveedores();
          if (!res.success) throw new Error(res.code);
          return res.data;
        },
        DEMO_PROVEEDORES,
      ),
  });
}

export function useProveedoresYProductos() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["proveedores-productos"], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          const res = await obtenerProveedoresYProductos();
          if (!res.success) throw new Error(res.code);
          return res.data;
        },
        demoProveedoresYProductos,
      ),
  });
}

export function useHistorialCompras() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["compras-historial"], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          const res = await obtenerHistorialCompras();
          if (!res.success) throw new Error(res.code);
          return res.data;
        },
        DEMO_COMPRAS,
      ),
  });
}

export function useComprasProveedor(proveedorId: string | null) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["compras-proveedor", proveedorId], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          if (!proveedorId) return [];
          const res = await obtenerComprasProveedor(proveedorId);
          if (!res.success) throw new Error(res.code);
          return res.data;
        },
        DEMO_COMPRAS.filter((c) => c.proveedor_id === proveedorId) as Awaited<
          ReturnType<typeof obtenerComprasProveedor>
        > extends { success: true; data: infer D }
          ? D
          : never,
      ),
    enabled: !!proveedorId,
  });
}

export function useDetalleCompra(compraId: string | null) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["compra-detalle", compraId], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          if (!compraId) return [];
          const res = await obtenerDetalleCompra(compraId);
          if (!res.success) throw new Error(res.code);
          return res.data;
        },
        DEMO_COMPRA_DETALLE.filter((d) => d.compra_id === compraId),
      ),
    enabled: !!compraId,
  });
}

export function useGuardarProveedor() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: ProveedorInput }) => {
      assertWritableDemo(isDemoMode);
      const res = await guardarProveedor(id, data);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      queryClient.invalidateQueries({ queryKey: ["proveedores-productos"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useEliminarProveedor() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      assertWritableDemo(isDemoMode);
      const res = await eliminarProveedor(id);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      queryClient.invalidateQueries({ queryKey: ["proveedores-productos"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useCrearCompra() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CompraInput) => {
      assertWritableDemo(isDemoMode);
      const res = await crearCompra(data);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proveedores-productos"] });
      queryClient.invalidateQueries({ queryKey: ["compras-historial"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useActualizarEstadoPagoCompra() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: "Pagado" | "Pendiente" }) => {
      assertWritableDemo(isDemoMode);
      const res = await actualizarEstadoPagoCompra(id, estado);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras-historial"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRegistrarAbonoCompra() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      monto,
      metodo,
      notas,
    }: {
      id: string;
      monto: number;
      metodo: string;
      notas?: string;
    }) => {
      assertWritableDemo(isDemoMode);
      const res = await registrarAbonoCompra(id, monto, metodo, notas);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras-historial"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
