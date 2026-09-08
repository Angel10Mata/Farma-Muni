import { Suspense } from "react";
import { VerUsuarios } from "@/components/(base)/(users)/usuarios/VerUsuarios";

export default function UsuariosPage() {
  return (
    <Suspense fallback={null}>
      <VerUsuarios />
    </Suspense>
  );
}
