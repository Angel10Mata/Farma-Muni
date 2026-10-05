import { Suspense } from "react";
import { VerAdmin } from "@/components/(base)/admin/VerAdmin";

// Administración
export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <VerAdmin />
    </Suspense>
  );
}
