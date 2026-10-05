import { Suspense } from "react";
import { VerDispositivos } from "@/components/(base)/(auth)/devices/VerDispositivos";

// Dispositivos autorizados
export default function DispositivosPage() {
  return (
    <Suspense fallback={null}>
      <VerDispositivos />
    </Suspense>
  );
}
