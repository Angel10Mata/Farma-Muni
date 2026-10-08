import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import {
  DEMO_PRODUCTOS,
  DEMO_PROVEEDORES,
  DEMO_UBICACIONES,
} from "@/lib/demo/fixtures";
import {
  assertWritableDemo,
  demoQueryKey,
  resolveDemoData,
} from "@/lib/demo/helpers";
import {
  obtenerProducto,
  obtenerProductos,
  guardarProducto,
  activarProducto,
  desactivarProducto,
  obtenerUbicaciones,
  obtenerLotes,
  registrarBajaPorVencimiento,
  crearLoteManual,
} from "./actions";
import { type ProductFormValues } from "./zod";

// Modo edición en pantalla
export function useEditMode(initial = false) {
  const [isEditing, setIsEditing] = useState(initial);
  return {
    isEditing,
    enableEdit: () => setIsEditing(true),
    disableEdit: () => setIsEditing(false),
    toggleEdit: () => setIsEditing((prev) => !prev),
    setIsEditing,
  };
}

// Consultas de inventario
export function useLotes() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["inventario", "lotes"], isDemoMode),
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_PRODUCTOS.map((p, i) => {
          const prov = DEMO_PROVEEDORES[i % DEMO_PROVEEDORES.length];
          return {
          id: `demo-lote-${p.id}`,
          producto_id: p.id,
          codigo_barras: `DEMO-${String(i + 1).padStart(4, "0")}`,
          numero_lote: `L-${2400 + i}`,
          cantidad_inicial: p.stock_actual,
          cantidad_actual: p.stock_actual,
          precio_costo: Math.round(p.precio_base * 0.65 * 100) / 100,
          precio_venta: p.precio_base,
          proveedor_id: prov.id,
          laboratorio: prov.nombre,
          fecha_vencimiento: `2026-${String((i % 12) + 1).padStart(2, "0")}-28`,
          ubicacion: "Demo",
          activo: p.activo,
          inv_proveedores: { nombre: prov.nombre },
          inv_productos: {
            id: p.id,
            nombre: p.nombre,
            nombre_generico: p.nombre_generico,
            concentracion: p.concentracion,
            forma_farmaceutica: p.forma_farmaceutica,
            presentacion: p.presentacion,
            unidad_venta: p.unidad_venta,
            requiere_receta: p.requiere_receta,
            precio_base: p.precio_base,
            stock_minimo: p.stock_minimo,
            stock_actual: p.stock_actual,
            activo: p.activo,
          },
        };
        });
      }
      const res = await obtenerLotes();
      if (!res.success) throw new Error(res.code);
      return res.data;
    },
    staleTime: 1000 * 60 * 3,
  });
}

export function useProductos() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["productos"], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          const res = await obtenerProductos();
          if (!res.success) throw new Error(res.code);
          return res.data;
        },
        DEMO_PRODUCTOS,
      ),
    staleTime: 1000 * 60 * 3,
  });
}

export function useProducto(id: string | null) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["producto", id], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          if (!id) return null;
          const res = await obtenerProducto(id);
          if (!res.success) throw new Error(res.code);
          return res.data;
        },
        () => DEMO_PRODUCTOS.find((p) => p.id === id) ?? null,
      ),
    enabled: !!id,
    staleTime: 1000 * 60 * 3,
  });
}

export function useUbicaciones() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["ubicaciones"], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          const res = await obtenerUbicaciones();
          if (!res.success) throw new Error(res.code);
          return res.data;
        },
        DEMO_UBICACIONES,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

// Guardar y cambios de catálogo
export function useGuardarProducto() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: ProductFormValues }) => {
      assertWritableDemo(isDemoMode);
      const res = await guardarProducto(id, data);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
}

export function useCrearLoteManual() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof crearLoteManual>[0]) => {
      assertWritableDemo(isDemoMode);
      const res = await crearLoteManual(input);
      if (!res.success) {
        const err = new Error(res.code) as Error & { detail?: string };
        if ("detail" in res && res.detail) err.detail = res.detail;
        throw err;
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["inventario", "lotes"] });
    },
  });
}

export function useRegistrarBajaVencido() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { lote_id: string; notas?: string }) => {
      assertWritableDemo(isDemoMode);
      const res = await registrarBajaPorVencimiento(input);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["inventario", "lotes"] });
      queryClient.invalidateQueries({ queryKey: ["finanzas"] });
    },
  });
}

export function useDesactivarProducto() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      assertWritableDemo(isDemoMode);
      const res = await desactivarProducto(id);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useActivarProducto() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      assertWritableDemo(isDemoMode);
      const res = await activarProducto(id);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
