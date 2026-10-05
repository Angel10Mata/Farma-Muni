import { Suspense } from "react";
import { VerClientes } from "@/components/(base)/clientes/VerClientes";

// Módulo clientes
export default function ClientesPage() {
  return (
    <Suspense fallback={null}>
      <VerClientes />
    </Suspense>
  );
}
