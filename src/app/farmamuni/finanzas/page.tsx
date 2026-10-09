import { Suspense } from "react";
import { VerFinanzas } from "@/components/(base)/finanzas/VerFinanzas";
import { requireFinanzasPageAccess } from "@/lib/user-role";

export default async function FinanzasPage() {
  await requireFinanzasPageAccess();

  return (
    <Suspense fallback={null}>
      <VerFinanzas />
    </Suspense>
  );
}
