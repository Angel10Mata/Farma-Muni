"use client";

import { useState, useMemo, Fragment, useEffect } from "react";
import { useUsers } from "./lib/hooks";
import { useUserContext } from "@/components/(base)/providers/UserProvider";
import { canCreateUsers, ROLE_LABELS, ROLE_ORDER } from "./lib/permissions";
import { UsuarioRolCelda } from "./UsuarioRolCelda";
import { Loader2, UserX, Search } from "lucide-react";
import { UserPlus, Check } from "lucide";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import VerPerfil from "@/components/(base)/(users)/profile/VerPerfil";
import SignUp from "@/components/(base)/(auth)/signup/SignUp";
import { modulePageScrollClass } from "@/lib/module-layout";
import { ModuleHeaderBackButton } from "@/components/(base)/layout/ModuleHeaderBackButton";
import {
  moduleTableBodyClass,
  moduleTableCellClass,
  moduleTableClass,
  ModuleTableFooter,
  moduleTableHeadCellClass,
  moduleTableHeadRowClass,
  moduleTableRowClass,
  moduleTableScrollClass,
  moduleTableSearchClass,
  moduleTableShellClass,
} from "@/components/ui/module-table";
import { cn } from "@/lib/utils";

// Usuarios
export function VerUsuarios() {
  const { effectiveRole, realRole, user: sessionUser } = useUserContext();
  const usersListRole = ["super", "admin"].includes(realRole) ? realRole : effectiveRole;
  const canCreateUser = canCreateUsers(realRole);

  // Datos
  const { data: users, isLoading, isError, refetch } = useUsers(usersListRole);

  // Estado
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(10);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLargeScreen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const handleUserClick = (id: string) => {
    setSelectedUserId(id);
    setIsProfileOpen(true);
  };

  const handleCloseSignUp = () => {
    setIsSignUpOpen(false);
    refetch();
  };

  const roleLabels = ROLE_LABELS;

  const compareUsersByRoleThenName = (
    a: { nombre?: string | null; rol?: string | null },
    b: { nombre?: string | null; rol?: string | null },
  ) => {
    const roleA = a.rol || "user";
    const roleB = b.rol || "user";
    const indexA = ROLE_ORDER.indexOf(roleA as (typeof ROLE_ORDER)[number]);
    const indexB = ROLE_ORDER.indexOf(roleB as (typeof ROLE_ORDER)[number]);
    const keyA = indexA >= 0 ? indexA : ROLE_ORDER.length;
    const keyB = indexB >= 0 ? indexB : ROLE_ORDER.length;
    if (keyA !== keyB) return keyA - keyB;
    if (roleA !== roleB) {
      return roleA.localeCompare(roleB, "es", { sensitivity: "base" });
    }
    const nameA = a.nombre || "";
    const nameB = b.nombre || "";
    return sortOrder === "asc"
      ? nameA.localeCompare(nameB, "es", { sensitivity: "base" })
      : nameB.localeCompare(nameA, "es", { sensitivity: "base" });
  };

  const availableRoles = useMemo(() => {
    if (!users) return [];
    const roles = Array.from(new Set(users.map((u) => u.rol))).filter(Boolean);
    return roles;
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];

    return users
      .filter((u) => {
        const matchesSearch = (u.nombre || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "all" || u.rol === roleFilter;
        return matchesSearch && matchesRole;
      })
      .sort((a, b) => {
        if (roleFilter === "all") {
          return compareUsersByRoleThenName(a, b);
        }
        const nameA = a.nombre || "";
        const nameB = b.nombre || "";
        return sortOrder === "asc"
          ? nameA.localeCompare(nameB, "es", { sensitivity: "base" })
          : nameB.localeCompare(nameA, "es", { sensitivity: "base" });
      });
  }, [users, searchQuery, sortOrder, roleFilter]);

  const totalUsers = filteredUsers.length;
  const isAll = pageSize === "all";
  const totalPages = isAll ? 1 : Math.ceil(totalUsers / (pageSize as number));

  const paginatedUsers = useMemo(() => {
    if (isAll) return filteredUsers;
    const size = pageSize as number;
    return filteredUsers.slice((currentPage - 1) * size, currentPage * size);
  }, [filteredUsers, isAll, currentPage, pageSize]);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setPageSize(val === "all" ? "all" : Number(val));
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex h-40 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-40 w-full flex-col items-center justify-center gap-2 text-destructive">
        <UserX className="h-8 w-8" />
        <p>Error al cargar usuarios</p>
      </div>
    );
  }

  return (
    <>
      <div className={modulePageScrollClass}>
        <div className="flex flex-col gap-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <ModuleHeaderBackButton size="sm" />
              <div>
              <h2 className="text-sm xl:text-xl font-bold tracking-tight text-foreground">
                Gestión de Usuarios
              </h2>
              <p className="text-xs">
                Rol Actual:{" "}
                <span className="text-[10px] underline font-bold uppercase">
                  {roleLabels[effectiveRole] || effectiveRole}
                </span>
                {realRole !== effectiveRole && (
                  <span className="text-[10px] text-muted-foreground ml-1">
                    (simulación)
                  </span>
                )}
              </p>
              </div>
            </div>
            {canCreateUser && !isSignUpOpen && (
              <SigetActionButton
                label="Crear usuario"
                accentColor={sigetAccent.crear}
                morphFrom={UserPlus}
                morphTo={Check}
                onClick={() => setIsSignUpOpen(true)}
                ariaLabel="Crear usuario en la base de datos"
                className="w-auto shrink-0"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={cn(moduleTableSearchClass, "pl-10 h-9")}
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
            </div>
          </div>
        </div>

        <div className={moduleTableShellClass}>
          <div className={cn(moduleTableScrollClass, "min-h-0 overflow-auto")}>
            <table className={moduleTableClass}>
            <thead>
              <tr className={moduleTableHeadRowClass}>
                <th className={moduleTableHeadCellClass}>
                  <select
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(e.target.value as "asc" | "desc")
                    }
                    className="bg-transparent font-black uppercase tracking-wider focus:outline-none cursor-pointer transition-colors w-full sm:w-auto"
                  >
                    <option value="asc">Ordenar (A-Z)</option>
                    <option value="desc">Ordenar (Z-A)</option>
                  </select>
                </th>
                <th className={cn(moduleTableHeadCellClass, "text-right")}>
                  <div className="flex items-center justify-end gap-1">
                    <select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-transparent font-black uppercase tracking-wider focus:outline-none cursor-pointer transition-colors text-right"
                    >
                      <option value="all">Rol: Todos</option>
                      {availableRoles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role] || role}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className={moduleTableBodyClass}>
              {paginatedUsers.map((userItem, index) => {
                const roleKey = userItem.rol || "user";
                const globalIndex = isAll
                  ? index
                  : (currentPage - 1) * (pageSize as number) + index;
                const prevUser =
                  globalIndex > 0 ? filteredUsers[globalIndex - 1] : null;
                const prevRoleKey = prevUser ? prevUser.rol || "user" : null;
                const showRoleSeparator =
                  roleFilter === "all" && roleKey !== prevRoleKey;

                return (
                  <Fragment key={userItem.id}>
                    {showRoleSeparator && (
                      <tr>
                        <td
                          colSpan={2}
                          className="bg-zinc-100 dark:bg-zinc-800/50 px-5 py-2 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest"
                        >
                          {roleLabels[roleKey] || roleKey}
                        </td>
                      </tr>
                    )}
                    <tr
                      onClick={() => handleUserClick(userItem.id)}
                      className={cn(moduleTableRowClass, "group cursor-pointer")}
                    >
                      <td className={cn(moduleTableCellClass, "font-medium group-hover:text-primary transition-colors")}>
                        {userItem.nombre || "Sin Nombre"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <UsuarioRolCelda
                            userId={userItem.id}
                            rol={userItem.rol}
                            actorRealRole={realRole}
                            isSelf={sessionUser?.id === userItem.id}
                            onUpdated={() => refetch()}
                          />
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="p-12 flex flex-col items-center gap-4 text-center text-muted-foreground text-xs uppercase font-medium">
              <p>
                {searchQuery
                  ? "No se encontraron coincidencias."
                  : canCreateUser
                    ? "No hay usuarios con estos filtros. Crea el primero con el botón superior."
                    : "No hay usuarios disponibles con estos filtros."}
              </p>
              {canCreateUser && !searchQuery && !isSignUpOpen && (
                <SigetActionButton
                  label="Crear usuario"
                  accentColor={sigetAccent.crear}
                  morphFrom={UserPlus}
                  morphTo={Check}
                  onClick={() => setIsSignUpOpen(true)}
                  className="w-auto shrink-0 normal-case"
                />
              )}
            </div>
          )}
          </div>

          {/* Barra de Paginación */}
          {!isAll && (
            <ModuleTableFooter
              itemCount={filteredUsers.length}
              pageSize={pageSize as number}
              setPageSize={setPageSize}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      <VerPerfil
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userId={selectedUserId}
      />

      {isSignUpOpen && canCreateUser && (
        <SignUp
          isOpen
          onClose={handleCloseSignUp}
          onSuccess={() => refetch()}
          presentation={isLargeScreen ? "modal" : "fullscreen"}
        />
      )}
    </>
  );
}
