"use client";

import { useState } from "react";
import SignUp from "@/components/(base)/(auth)/signup/SignUp";

export default function RegistroUsuario() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <SignUp
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        presentation="fullscreen"
      />
    </main>
  );
}
