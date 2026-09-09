import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import {
  DEMO_PRODUCTOS,
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
  eliminarProducto,
  obtenerUbicaciones,
} from "./actions";
import { type ProductFormValues } from "./zod";

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
  });
}

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
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useEliminarProducto() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      assertWritableDemo(isDemoMode);
      const res = await eliminarProducto(id);
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
