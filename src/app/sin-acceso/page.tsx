import { Suspense } from "react";
import SinAccesoContent from "./SinAccesoContent";

export default function SinAccesoPage() {
  return (
    <Suspense fallback={null}>
      <SinAccesoContent />
    </Suspense>
  );
}
