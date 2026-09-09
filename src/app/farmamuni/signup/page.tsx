import { Suspense } from "react";
import RegistroUsuario from "@/components/(base)/(auth)/signup/RegistroUsuario";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <RegistroUsuario />
    </Suspense>
  );
}
