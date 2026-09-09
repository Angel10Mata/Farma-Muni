import { Suspense } from "react";
import { VerVentas } from "@/components/(base)/ventas/VerVentas";

export default function VentasPage() {
  return (
    <Suspense fallback={null}>
      <VerVentas />
    </Suspense>
  );
}
