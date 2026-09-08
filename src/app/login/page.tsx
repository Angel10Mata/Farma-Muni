import { Suspense } from "react";
import IniciarSesion from "@/components/(base)/(auth)/login/IniciarSesion";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <IniciarSesion />
    </Suspense>
  );
}
