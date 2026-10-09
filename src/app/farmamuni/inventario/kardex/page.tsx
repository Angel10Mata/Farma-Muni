import { Suspense } from "react";
import { VerKardex } from "@/components/(base)/inventario/VerKardex";

export default function InventarioKardexPage() {
  return (
    <Suspense fallback={null}>
      <VerKardex />
    </Suspense>
  );
}
