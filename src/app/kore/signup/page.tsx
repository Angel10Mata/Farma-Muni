"use client";

import { useState, Suspense } from "react";
import SignupForm from "@/components/(base)/(auth)/signup/SignUp";

export default function SignupPage() {
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <Suspense>
      <main className="min-h-screen flex items-center justify-center bg-background">
        <SignupForm isOpen={isOpen} onClose={handleClose} />

        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-xs"
          >
            ABRIR REGISTRO
          </button>
        )}
      </main>
    </Suspense>
  );
}
