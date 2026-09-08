"use client";

import { useState } from "react";
import FormularioRegistro from "@/components/(base)/(auth)/signup/forms/Crear";

export default function RegistroUsuario() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <FormularioRegistro isOpen={isOpen} onClose={() => setIsOpen(false)} />

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-xs"
        >
          ABRIR REGISTRO
        </button>
      )}
    </main>
  );
}
