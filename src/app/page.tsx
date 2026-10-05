import { Suspense } from "react";
import IniciarSesion from "@/components/(base)/(auth)/login/IniciarSesion";

// Inicio de sesión
export default function Home() {
  return (
    <Suspense fallback={null}>
      <IniciarSesion />
    </Suspense>
  );
}
