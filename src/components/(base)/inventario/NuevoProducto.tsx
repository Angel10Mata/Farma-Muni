"use client";

import { useRouter } from "next/navigation";
import { CrearProducto } from "./forms/Crear";

// Página para dar de alta un producto
export function NuevoProducto() {
  const router = useRouter();

  return (
    <CrearProducto
      onClose={() => router.push("/farmamuni/inventario")}
      onSuccess={() => router.push("/farmamuni/inventario")}
    />
  );
}
