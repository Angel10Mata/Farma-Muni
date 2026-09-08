"use client";

import { useRouter } from "next/navigation";
import { CrearProducto } from "./forms/Crear";

export function NuevoProducto() {
  const router = useRouter();

  return (
    <CrearProducto
      onClose={() => router.push("/farmacia-la-salud/inventario")}
      onSuccess={() => router.push("/farmacia-la-salud/inventario")}
    />
  );
}
