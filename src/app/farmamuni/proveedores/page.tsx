import { Suspense } from "react";
import VerProveedores from "@/components/(base)/proveedores/VerProveedores";

// Módulo proveedores y compras
export default function ProveedoresPage() {
  return (
    <Suspense fallback={null}>
      <VerProveedores />
    </Suspense>
  );
}
