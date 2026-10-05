import { Suspense } from "react";
import RegistroUsuario from "@/components/(base)/(auth)/signup/RegistroUsuario";

// Registro de farmacia
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <RegistroUsuario />
    </Suspense>
  );
}
