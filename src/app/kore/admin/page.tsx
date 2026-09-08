import { Suspense } from "react";
import { VerAdmin } from "@/components/(base)/admin/VerAdmin";

export default function KoreAdminPage() {
  return (
    <Suspense fallback={null}>
      <VerAdmin />
    </Suspense>
  );
}
