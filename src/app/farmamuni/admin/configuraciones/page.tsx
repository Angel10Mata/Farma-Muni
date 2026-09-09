import { Suspense } from "react";
import VerConfiguraciones from "@/components/(base)/(settings)/VerConfiguraciones";

export default function ConfiguracionesPage() {
  return (
    <Suspense fallback={null}>
      <VerConfiguraciones />
    </Suspense>
  );
}
