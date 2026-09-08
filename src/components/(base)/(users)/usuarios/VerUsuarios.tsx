"use client";

import { useState, useMemo, Fragment } from "react";
import { useUsers } from "./lib/hooks";
import { useUser } from "@/components/(base)/providers/UserProvider";
import { Loader2, UserX, Search } from "lucide-react";
import { UserPlus, Check } from "lucide";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import VerPerfil from "@/components/(base)/(users)/profile/VerPerfil";
import FormularioRegistro from "@/components/(base)/(auth)/signup/forms/Crear";
import { Pagination, PageSizeSelect } from "@/components/ui/pagination";

export function VerUsuarios() {
  const user = useUser();
  const userRole = user?.user_metadata?.rol || "user";

  const { data: users, isLoading, isError, refetch } = useUsers(userRole);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(10);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);

  const handleUserClick = (id: string) => {
    setSelectedUserId(id);
    setIsProfileOpen(true);
  };

  const handleCloseSignUp = () => {
    setIsSignUpOpen(false);
    refetch();
  };

  const roleLabels: Record<string, string> = {
    user: "Usuario (Estándar)",
    admin: "Administrador",
    super: "Super Admin",
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
      <div className="flex flex-col h-[calc(100vh-4rem)] w-full max-w-3xl mx-auto pt-32 md:pt-36 pb-10 overflow-hidden">
        <div className="flex flex-col gap-6 mb-6 px-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm xl:text-xl font-bold tracking-tight text-foreground">
                Gestión de Usuarios
              </h2>
              <p className="text-xs">
                Rol Actual:{" "}
                <span className="text-[10px] underline font-bold uppercase">
                  {roleLabels[userRole] || userRole}
                </span>
              </p>
            </div>
            {(userRole === "admin" || userRole === "super") && (
              <SigetActionButton
                label="Crear"
                accentColor={sigetAccent.crear}
                morphFrom={UserPlus}
                morphTo={Check}
                onClick={() => setIsSignUpOpen(true)}
                ariaLabel="Nuevo usuario"
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
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground h-9"
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0 bg-card border border-border rounded-xl mx-4 overflow-hidden shadow-sm">
          <div className="w-full flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                <th className="px-5 py-3.5">
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
                <th className="px-5 py-3.5 text-right">
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
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
              {paginatedUsers.map((userItem, index) => {
                const firstLetter = (userItem.nombre || "#")
                  .charAt(0)
                  .toUpperCase();
                const prevFirstLetter =
                  index > 0
                    ? (paginatedUsers[index - 1].nombre || "#")
                        .charAt(0)
                        .toUpperCase()
                    : null;
                const showSeparator = firstLetter !== prevFirstLetter;

                return (
                  <Fragment key={userItem.id}>
                    {showSeparator && (
                      <tr>
                        <td
                          colSpan={2}
                          className="bg-zinc-100 dark:bg-zinc-800/50 px-5 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest"
                        >
                          {firstLetter}
                        </td>
                      </tr>
                    )}
                    <tr
                      onClick={() => handleUserClick(userItem.id)}
                      className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 font-medium group-hover:text-primary transition-colors">
                        {userItem.nombre || "Sin Nombre"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="capitalize text-[10px] font-bold bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                            {userItem.rol ? roleLabels[userItem.rol] || userItem.rol : "Sin Rol"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="p-12 text-center text-muted-foreground text-xs uppercase font-medium">
              {searchQuery
                ? "No se encontraron coincidencias."
                : "No hay usuarios disponibles con estos filtros."}
            </div>
          )}
          </div>

          {/* Barra de Paginación */}
          {!isAll && filteredUsers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/50 text-muted-foreground">
              <PageSizeSelect
                pageSize={pageSize as number}
                setPageSize={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
              <div className="flex justify-center w-full sm:w-auto">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(p) => setCurrentPage(p)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <VerPerfil
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userId={selectedUserId}
      />

      <FormularioRegistro isOpen={isSignUpOpen} onClose={handleCloseSignUp} />
    </>
  );
}
