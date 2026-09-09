import { Suspense } from "react";
import { VerCreditos } from "@/components/(base)/creditos/VerCreditos";

export default function CreditosPage() {
  return (
    <Suspense fallback={null}>
      <VerCreditos />
    </Suspense>
  );
}
