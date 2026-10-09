import { Suspense } from "react";
import { VerAdmin } from "@/components/(base)/admin/VerAdmin";

export const dynamic = "force-dynamic";

// Admin (ruta Kore)
export default function KoreAdminPage() {
  return (
    <Suspense fallback={null}>
      <VerAdmin />
    </Suspense>
  );
}
