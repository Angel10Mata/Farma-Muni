import { Suspense } from "react";
import VerProveedores from "@/components/(base)/proveedores/VerProveedores";

export default function ProveedoresPage() {
  return (
    <Suspense fallback={null}>
      <VerProveedores />
    </Suspense>
  );
}
