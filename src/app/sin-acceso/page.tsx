import { Suspense } from "react";
import SinAccesoContent from "./SinAccesoContent";

// Sin permiso al módulo
export default function SinAccesoPage() {
  return (
    <Suspense fallback={null}>
      <SinAccesoContent />
    </Suspense>
  );
}
