import { Suspense } from "react";
import { VerFinanzas } from "@/components/(base)/finanzas/VerFinanzas";

export default function FinanzasPage() {
  return (
    <Suspense fallback={null}>
      <VerFinanzas />
    </Suspense>
  );
}
