import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import EsperandoAccesoContent from "./EsperandoAccesoContent";

// Pantalla de espera de dispositivo
export default function EsperandoAccesoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4 text-foreground">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EsperandoAccesoContent />
    </Suspense>
  );
}
