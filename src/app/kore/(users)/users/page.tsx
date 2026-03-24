import { Suspense } from "react";

import { VerUsuarios } from "@/components/(base)/(users)/users/VerUsuarios";
export default function SignupPage() {
  return (
    <Suspense>
      <VerUsuarios />
    </Suspense>
  );
}
