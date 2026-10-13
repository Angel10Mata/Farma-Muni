"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { EditarProducto } from "./forms/VerEditar";
import { useProducto } from "./lib/hooks";
import type { Producto } from "./lib/zod";

export function EditarProductoPorId({ id }: { id: string }) {
  const router = useRouter();
  const { data: producto, isLoading, isError, error } = useProducto(id);

  useEffect(() => {
    if (!isError) return;
    const code = error instanceof Error ? error.message : "";
    if (code === "UNAUTHORIZED") {
      toast.error("Debes iniciar sesión para editar productos.");
    } else if (code === "NOT_FOUND") {
      toast.error(
        "No se encontró el producto comercial. Abre la vista Comercial o edita desde un lote con producto vinculado.",
      );
    } else {
      toast.error("No se pudo cargar la información del producto.");
    }
    router.push("/farmamuni/inventario");
  }, [isError, error, router]);

  // Pantalla de edición
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] w-full max-w-2xl flex-col items-center justify-center gap-3 mx-auto">
        <div className="size-8 animate-spin rounded-full border-b-2 border-zinc-400" />
        <p className="text-sm text-muted-foreground">Cargando datos del producto...</p>
      </div>
    );
  }

  if (!producto) {
    return null;
  }

  return (
    <EditarProducto
      producto={producto as Producto}
      onClose={() => router.push("/farmamuni/inventario")}
      onSuccess={() => router.push("/farmamuni/inventario")}
    />
  );
}
