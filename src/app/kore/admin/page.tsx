import { Suspense } from "react";
import { AdminPanel } from "@/components/(base)/admin/index";

export default function AdminPage() {
  return (
    <Suspense>
      <AdminPanel />
    </Suspense>
  );
}
