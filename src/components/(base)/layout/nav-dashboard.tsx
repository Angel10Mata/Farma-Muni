"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dock, DockIcon } from "@/components/ui/dock";
import { User, LogOut, Home } from "lucide-react";
import { logout } from "@/app/actions";
import Swal from "sweetalert2";
import { useUser } from "@/components/(base)/providers/UserProvider";

import VerPerfil from "@/components/(base)/(users)/profile/VerPerfil";

export function NavDashboard({ user }: { user?: any } = {}) {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const sessionUser = useUser();

  const isActive = (path: string) => pathname === path;

  const ActiveDot = () => (
    <div className="absolute -bottom-2 h-1.5 w-1.5 rounded-full bg-primary transition-all shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
  );

  const handleLogout = async () => {
    const isDark = document.documentElement.classList.contains("dark");

    const result = await Swal.fire({
      title: "¿Cerrar sesión?",
      text: "Se cerrará tu sesión actual.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: isDark ? "#3b82f6" : "#2563eb",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "Sí, salir",
      cancelButtonText: "Cancelar",
      background: isDark ? "#09090b" : "#ffffff",
      color: isDark ? "#ffffff" : "#000000",
    });

    if (result.isConfirmed) {
      await logout();
    }
  };

  return (
    <>
      <div className="fixed bottom-8 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <Dock
            direction="middle"
            iconSize={35}
            iconMagnification={52}
            className="h-14 border-border/40 bg-background/60 backdrop-blur-md px-6 gap-6"
          >
            <Link href="/kore">
              <DockIcon label="Dashboard">
                <div className="relative flex flex-col items-center justify-center h-full">
                  <Home
                    className={`size-6 transition-all duration-300 ${isActive("/kore") ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  />
                  {isActive("/kore") && <ActiveDot />}
                </div>
              </DockIcon>
            </Link>

            <div className="h-6 w-px bg-border/40 self-center" />

            <DockIcon label="Mi Perfil" onClick={() => setIsProfileOpen(true)}>
              <div className="relative flex flex-col items-center justify-center h-full cursor-pointer">
                <User
                  className={`size-6 transition-all duration-300 ${isProfileOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                />
                {isProfileOpen && <ActiveDot />}
              </div>
            </DockIcon>

            <div className="h-6 w-px bg-border/40 self-center" />

            <DockIcon label="Salir" onClick={handleLogout} className="group">
              <LogOut className="size-6 text-muted-foreground group-hover:text-destructive transition-colors duration-300" />
            </DockIcon>
          </Dock>
        </div>
      </div>

      <VerPerfil
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userId={sessionUser?.id || user?.id || null}
      />
    </>
  );
}
