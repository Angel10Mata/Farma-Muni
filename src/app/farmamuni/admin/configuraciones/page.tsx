import { Suspense } from "react";
import VerConfiguraciones from "@/components/(base)/(settings)/VerConfiguraciones";

// Configuración de la farmacia
export default function ConfiguracionesPage() {
  return (
    <Suspense fallback={null}>
      <VerConfiguraciones />
    </Suspense>
  );
}
