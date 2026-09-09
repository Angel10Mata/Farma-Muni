"use client";

import { useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronDown, FlaskConical, Shield } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import VerPerfil from "@/components/(base)/(users)/profile/VerPerfil";
import { useProfile } from "@/components/(base)/(users)/profile/lib/hooks";
import ModalPasskeys from "@/components/(base)/layout/modals/ModalPasskeys";
import { MorphIconBox } from "@/components/ui/morph-hover-icon";
import { AuroraText } from "@/components/ui/aurora-text";
import { PushNotificationToggle } from "@/components/ui/PushNotificationToggle";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import { useUserContext } from "@/components/(base)/providers/UserProvider";
import { ADMIN_MENU_ITEMS, APP_MODULES } from "@/lib/app-modules";
import {
  adminIconColors,
  adminMorphIcons,
  moduleIconColors,
  moduleMorphIcons,
  navIconColors,
  navMorphIcons,
} from "@/lib/morph-icons";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

interface MenuProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: User | null;
}

function MenuSectionLabel({
  dotClass,
  children,
}: {
  dotClass: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-1 mb-3">
      <span className={cn("size-2 rounded-full shrink-0", dotClass)} />
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
        {children}
      </span>
    </div>
  );
}

function MenuAccordionChevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      className={cn(
        "size-4 text-zinc-500 transition-transform duration-200 shrink-0",
        open && "rotate-180",
      )}
    />
  );
}

export default function Menu({ isOpen, setIsOpen, user }: MenuProps) {
  const pathname = usePathname();
  const { realRole, effectiveRole, simulatedRole, setSimulatedRole } =
    useUserContext();
  const { isDemoMode, setDemoMode } = useDemoMode();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasskeysOpen, setIsPasskeysOpen] = useState(false);
  const [modulosOpen, setModulosOpen] = useState(true);
  const [cuentaOpen, setCuentaOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  const isRoot = pathname === "/farmamuni";
  const isSuperOrAdmin = ["super", "admin"].includes(effectiveRole);
  const mobileTop = isRoot ? "top-14" : "top-[6.5rem]";
  const mobileHeight = isRoot
    ? "h-[calc(100vh-3.5rem)]"
    : "h-[calc(100vh-6.5rem)]";

  const metadata = user?.user_metadata || {};
  const username =
    metadata.username || user?.email?.split("@")[0] || "Invitado";
  const { profile } = useProfile(user?.id ?? "", isOpen && !!user);
  const displayName = profile?.nombre || metadata.nombre || "Usuario";

  const visibleModules = APP_MODULES.filter((mod) => {
    if (mod.requiresAdmin && !isSuperOrAdmin) return false;
    if (mod.allowedRoles && !mod.allowedRoles.includes(effectiveRole))
      return false;
    return true;
  });

  const closeMenu = () => setIsOpen(false);

  const handleLogout = async () => {
    closeMenu();
    const isDark = document.documentElement.classList.contains("dark");
    const result = await Swal.fire({
      title: "¿Cerrar sesión?",
      text: "Se cerrará tu sesión actual.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "Sí, salir",
      cancelButtonText: "Cancelar",
      background: isDark ? "#000000" : "#ffffff",
      color: isDark ? "#ffffff" : "#000000",
    });

    if (result.isConfirmed) {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.replace("/login");
    }
  };

  const isActivePath = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <VerPerfil
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userId={null}
      />
      <ModalPasskeys
        isOpen={isPasskeysOpen}
        onClose={() => setIsPasskeysOpen(false)}
        user={user}
      />

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={closeMenu}
        />
      )}

      <aside
        className={cn(
          `fixed right-0 ${mobileTop} md:top-16 z-50 ${mobileHeight} md:h-[calc(100vh-4rem)] w-full sm:w-100 bg-zinc-950 border-l border-zinc-800 transition-transform duration-500 overflow-y-auto shadow-2xl flex flex-col text-zinc-100`,
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-sm font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
            >
              <MorphIconBox
                from={navMorphIcons.logOut.from}
                to={navMorphIcons.logOut.to}
                size={16}
                color="#f87171"
                strokeWidth={2}
                spring="snappy"
                padding="xs"
                boxClassName="border-0 bg-transparent"
              />
              Cerrar Sesión
            </button>
          ) : (
            <div />
          )}
          <PushNotificationToggle />
        </div>

        <div className="flex flex-col flex-1 px-5 pb-6 gap-6">
          {user ? (
            <>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-1">
                      Usuario
                    </p>
                    <p className="text-sm font-bold text-[#6f9fd4] truncate">
                      {username}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-1">
                      Rol
                    </p>
                    <p className="text-sm font-bold text-[#6f9fd4] uppercase">
                      {effectiveRole}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-1">
                    Nombre
                  </p>
                  <p className="text-base font-bold text-white truncate">
                    {displayName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    toast.info("Manual de usuario disponible próximamente.")
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#2c5f9b]/60 bg-[#2c5f9b]/10 px-4 py-2.5 text-sm font-bold text-[#6f9fd4] hover:bg-[#2c5f9b]/20 transition-colors cursor-pointer"
                >
                  <BookOpen className="size-4 shrink-0" />
                  Manual de Usuario
                </button>
              </div>

              <section>
                <MenuSectionLabel dotClass="bg-[#2E9BD0]">Inicio</MenuSectionLabel>
                <Link
                  href="/farmamuni"
                  onClick={closeMenu}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition-colors",
                    isRoot
                      ? "border-[#2E9BD0]/50 bg-[#2c5f9b]/15 border-l-4 border-l-[#6f9fd4]"
                      : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900",
                  )}
                >
                  <MorphIconBox
                    from={navMorphIcons.home.from}
                    to={navMorphIcons.home.to}
                    size={18}
                    color={navIconColors.brandBright}
                    strokeWidth={2}
                    spring="snappy"
                    padding="sm"
                    boxClassName="border border-[#2c5f9b]/40 bg-[#2c5f9b]/20 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-black uppercase tracking-wide",
                        isRoot ? "text-[#6f9fd4]" : "text-white",
                      )}
                    >
                      Inicio
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
                      Panel principal y acceso a los módulos del sistema.
                    </p>
                  </div>
                </Link>
              </section>

              {visibleModules.length > 0 && (
                <section>
                  <MenuSectionLabel dotClass="bg-[#2563EB]">
                    Módulos
                  </MenuSectionLabel>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setModulosOpen((v) => !v)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-zinc-900 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MorphIconBox
                          from={navMorphIcons.fallback.from}
                          to={navMorphIcons.fallback.to}
                          size={18}
                          color={navIconColors.brandBright}
                          strokeWidth={2}
                          spring="snappy"
                          padding="sm"
                          boxClassName="border border-zinc-700 bg-zinc-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-black uppercase tracking-wide text-white">
                            FarmaMuni
                          </p>
                          <p className="text-xs text-zinc-500 truncate">
                            Ventas, inventario, clientes y más.
                          </p>
                        </div>
                      </div>
                      <MenuAccordionChevron open={modulosOpen} />
                    </button>
                    {modulosOpen && (
                      <div className="border-t border-zinc-800/80">
                        {visibleModules.map((mod) => {
                          const pair = moduleMorphIcons[mod.id];
                          const palette = moduleIconColors[mod.id];
                          const active = isActivePath(mod.href);
                          return (
                            <Link
                              key={mod.id}
                              href={mod.href}
                              onClick={closeMenu}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 border-t border-zinc-800/60 first:border-t-0 transition-colors",
                                active
                                  ? "bg-[#2c5f9b]/15 border-l-4 border-l-[#6f9fd4]"
                                  : "hover:bg-zinc-900/80",
                              )}
                            >
                              <MorphIconBox
                                from={pair.from}
                                to={pair.to}
                                size={16}
                                color={palette.color}
                                strokeWidth={2}
                                spring="snappy"
                                padding="xs"
                                boxClassName={cn(
                                  "border shrink-0",
                                  palette.boxClass,
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white">
                                  {mod.title}
                                </p>
                                <p className="text-[11px] text-zinc-500 line-clamp-1">
                                  {mod.desc}
                                </p>
                              </div>
                              <MorphIconBox
                                from={navMorphIcons.chevronRight.from}
                                to={navMorphIcons.chevronRight.to}
                                size={14}
                                color={navIconColors.brandBright}
                                strokeWidth={2}
                                spring="snappy"
                                padding="xs"
                                boxClassName="border-0 bg-transparent opacity-40 shrink-0"
                              />
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>
              )}

              <section>
                <MenuSectionLabel dotClass="bg-purple-500">
                  Mi Cuenta
                </MenuSectionLabel>
                <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCuentaOpen((v) => !v)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-purple-950/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MorphIconBox
                        from={navMorphIcons.user.from}
                        to={navMorphIcons.user.to}
                        size={18}
                        color="#A855F7"
                        strokeWidth={2}
                        spring="snappy"
                        padding="sm"
                        boxClassName="border border-purple-500/30 bg-purple-950/40 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-black uppercase tracking-wide text-white">
                          Mi Perfil y Ajustes
                        </p>
                        <p className="text-xs text-zinc-500">
                          Opciones de cuenta y seguridad.
                        </p>
                      </div>
                    </div>
                    <MenuAccordionChevron open={cuentaOpen} />
                  </button>
                  {cuentaOpen && (
                    <div className="border-t border-purple-500/20">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(true);
                          closeMenu();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-purple-950/30 transition-colors cursor-pointer"
                      >
                        <MorphIconBox
                          from={navMorphIcons.user.from}
                          to={navMorphIcons.user.to}
                          size={16}
                          color="#A855F7"
                          strokeWidth={2}
                          spring="snappy"
                          padding="xs"
                          boxClassName="border-0 bg-transparent shrink-0"
                        />
                        <div>
                          <p className="text-sm font-bold text-white">
                            Mi Perfil
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            Datos personales y credenciales.
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPasskeysOpen(true);
                          closeMenu();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 border-t border-purple-500/20 text-left hover:bg-purple-950/30 transition-colors cursor-pointer"
                      >
                        <MorphIconBox
                          from={navMorphIcons.fingerprint.from}
                          to={navMorphIcons.fingerprint.to}
                          size={16}
                          color={navIconColors.success}
                          strokeWidth={2}
                          spring="snappy"
                          padding="xs"
                          boxClassName="border-0 bg-transparent shrink-0"
                        />
                        <div>
                          <p className="text-sm font-bold text-white">
                            Ingreso Seguro
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            Passkeys y acceso sin contraseña.
                          </p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {isSuperOrAdmin && (
                <section>
                  <MenuSectionLabel dotClass="bg-cyan-400">
                    Administración
                  </MenuSectionLabel>
                  <div className="rounded-2xl border border-[#2E9BD0]/40 bg-[#2c5f9b]/10 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setAdminOpen((v) => !v)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[#2c5f9b]/20 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MorphIconBox
                          from={navMorphIcons.settings.from}
                          to={navMorphIcons.settings.to}
                          size={18}
                          color={navIconColors.brandBright}
                          strokeWidth={2}
                          spring="snappy"
                          padding="sm"
                          boxClassName="border border-[#2c5f9b]/40 bg-[#2c5f9b]/25 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-black uppercase tracking-wide text-[#6f9fd4]">
                            Ajustes Administrador
                          </p>
                          <p className="text-xs text-zinc-500">
                            Panel de administración de FarmaMuni.
                          </p>
                        </div>
                      </div>
                      <MenuAccordionChevron open={adminOpen} />
                    </button>
                    {adminOpen && (
                      <div className="border-t border-[#2E9BD0]/25">
                        <Link
                          href="/farmamuni/admin"
                          onClick={closeMenu}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 transition-colors",
                            pathname === "/farmamuni/admin"
                              ? "bg-[#2c5f9b]/20 border-l-4 border-l-[#6f9fd4]"
                              : "hover:bg-[#2c5f9b]/15",
                          )}
                        >
                          <MorphIconBox
                            from={navMorphIcons.settings.from}
                            to={navMorphIcons.settings.to}
                            size={16}
                            color={navIconColors.brandBright}
                            strokeWidth={2}
                            spring="snappy"
                            padding="xs"
                            boxClassName="border-0 bg-transparent shrink-0"
                          />
                          <div>
                            <p className="text-sm font-bold text-white">
                              Panel Admin
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              Vista general de administración.
                            </p>
                          </div>
                        </Link>
                        {ADMIN_MENU_ITEMS.map((item) => {
                          const pair = adminMorphIcons[item.id];
                          const palette = adminIconColors[item.id];
                          const active = isActivePath(item.href);
                          return (
                            <Link
                              key={item.id}
                              href={item.href}
                              onClick={closeMenu}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 border-t border-[#2E9BD0]/20 transition-colors",
                                active
                                  ? "bg-[#2c5f9b]/20 border-l-4 border-l-[#6f9fd4]"
                                  : "hover:bg-[#2c5f9b]/15",
                              )}
                            >
                              <MorphIconBox
                                from={pair.from}
                                to={pair.to}
                                size={16}
                                color={palette.color}
                                strokeWidth={2}
                                spring="snappy"
                                padding="xs"
                                boxClassName={cn(
                                  "border shrink-0",
                                  palette.boxClass,
                                )}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-white">
                                  {item.title}
                                </p>
                                <p className="text-[11px] text-zinc-500 line-clamp-1">
                                  {item.desc}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {isSuperOrAdmin && (
                <div className="rounded-2xl border border-violet-500/40 bg-violet-950/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDemoMode(!isDemoMode)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left cursor-pointer hover:bg-violet-950/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FlaskConical className="size-4 text-violet-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-black uppercase tracking-wide text-violet-300">
                          Simular datos
                        </p>
                        <p className="text-xs text-zinc-500">
                          Vista previa con datos de ejemplo.
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border shrink-0",
                        isDemoMode
                          ? "border-violet-400/60 bg-violet-500/20 text-violet-200"
                          : "border-zinc-700 bg-zinc-900 text-zinc-500",
                      )}
                    >
                      {isDemoMode ? "Activo" : "Off"}
                    </span>
                  </button>
                </div>
              )}

              {realRole === "super" && (
                <div className="rounded-2xl border border-amber-500/50 bg-amber-500/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setRoleOpen((v) => !v)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer hover:bg-amber-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Shield className="size-4 text-amber-400 shrink-0" />
                      <span className="text-sm font-bold text-amber-400 uppercase">
                        Rol Real: {realRole.toUpperCase()}
                      </span>
                    </div>
                    <MenuAccordionChevron open={roleOpen} />
                  </button>
                  {roleOpen && (
                    <div className="border-t border-amber-500/30 px-4 py-3">
                      <select
                        value={simulatedRole || ""}
                        onChange={(e) =>
                          setSimulatedRole(e.target.value || null)
                        }
                        className="w-full rounded-lg border border-amber-500/40 bg-zinc-950 px-3 py-2 text-xs font-bold text-amber-300 outline-none cursor-pointer"
                      >
                        <option value="">
                          Sin simulación ({realRole.toUpperCase()})
                        </option>
                        <option value="admin">Simular: ADMIN</option>
                        <option value="user">Simular: USER</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="mt-2">
              <Link
                href="/login"
                onClick={closeMenu}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#2c5f9b] text-white px-5 py-3.5 text-sm font-bold w-full hover:bg-[#2E9BD0] transition-colors"
              >
                <span>Iniciar Sesión</span>
                <MorphIconBox
                  from={navMorphIcons.logIn.from}
                  to={navMorphIcons.logIn.to}
                  size={16}
                  color="#ffffff"
                  strokeWidth={2}
                  spring="snappy"
                  padding="xs"
                  boxClassName="border-0 bg-transparent"
                />
              </Link>
            </div>
          )}
        </div>

        <div className="mt-auto border-t border-zinc-800 px-5 py-4">
          <div className="flex flex-col items-center justify-center gap-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
              © 2026 KoreAPP
            </p>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1">
              Powered by{" "}
              <a
                href="https://www.oscar27jimenez.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline cursor-pointer inline-flex items-center"
              >
                <AuroraText className="text-[10px] whitespace-nowrap">
                  Kore | Ing. de Software
                </AuroraText>
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
