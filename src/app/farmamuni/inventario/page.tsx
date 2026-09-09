import { Suspense } from "react";
import { VerInventario } from "@/components/(base)/inventario/VerInventario";

export default function InventarioPage() {
  return (
    <Suspense fallback={null}>
      <VerInventario />
    </Suspense>
  );
}
