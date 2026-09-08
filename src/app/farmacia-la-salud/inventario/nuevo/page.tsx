import { Suspense } from "react";
import { NuevoProducto } from "@/components/(base)/inventario/NuevoProducto";

export default function NuevoProductoPage() {
  return (
    <Suspense fallback={null}>
      <NuevoProducto />
    </Suspense>
  );
}
