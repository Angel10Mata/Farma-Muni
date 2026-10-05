import { Suspense } from "react";
import { VerDashboard } from "@/components/(base)/dashboard/VerDashboard";

// Panel principal
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <VerDashboard />
    </Suspense>
  );
}
