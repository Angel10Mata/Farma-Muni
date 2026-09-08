import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  return useQuery({
    queryKey: ["productos"],
    queryFn: async () => {
      const res = await obtenerProductos();
      if (!res.success) throw new Error(res.code);
      return res.data;
    },
  });
}

export function useProducto(id: string | null) {
  return useQuery({
    queryKey: ["producto", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await obtenerProducto(id);
      if (!res.success) throw new Error(res.code);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useUbicaciones() {
  return useQuery({
    queryKey: ["ubicaciones"],
    queryFn: async () => {
      const res = await obtenerUbicaciones();
      if (!res.success) throw new Error(res.code);
      return res.data;
    },
  });
}

export function useGuardarProducto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: ProductFormValues }) => {
      const res = await guardarProducto(id, data);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
}

export function useEliminarProducto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await eliminarProducto(id);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
}
