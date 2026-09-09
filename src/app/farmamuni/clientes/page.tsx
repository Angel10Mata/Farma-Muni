import { Suspense } from "react";
import { VerClientes } from "@/components/(base)/clientes/VerClientes";

export default function ClientesPage() {
  return (
    <Suspense fallback={null}>
      <VerClientes />
    </Suspense>
  );
}
