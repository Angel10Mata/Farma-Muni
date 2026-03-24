"use client";

import { useState, useMemo, Fragment } from "react";
import { useUsers } from "./lib/hooks";
import { useUser } from "@/components/(base)/providers/UserProvider";
import {
  Loader2,
  UserX,
  Shield,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import VerPerfil from "@/components/(base)/(users)/profile/VerPerfil";
import SignUp from "@/components/(base)/(auth)/signup/SignUp";

export function VerUsuarios() {
  const user = useUser();
  const userRole = user?.user_metadata?.rol || "user";

  const { data: users, isLoading, isError, refetch } = useUsers(userRole);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(5);
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
      <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-3xl mx-auto py-10 overflow-hidden">
        <div className="flex flex-col gap-6 mb-6 px-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm xl:text-xl font-bold tracking-tight text-foreground">
                Gestión de Usuarios
              </h2>
              <p className="text-xs">
                Rol Actual:{" "}
                <span className="text-[10px] underline font-bold uppercase">
                  {userRole}
                </span>
              </p>
            </div>
            {(userRole === "admin" || userRole === "super") && (
              <button
                onClick={() => setIsSignUpOpen(true)}
                className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </button>
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
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="h-9 rounded-md border border-border bg-card px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value="all">Todos</option>
              </select>

              {!isAll && (
                <>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground min-w-7.5 text-center">
                    {currentPage}/{totalPages}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto border border-border rounded-xl bg-card mx-4">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-md z-20">
              <tr>
                <th className="px-6 py-3 border-b border-border">
                  <select
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(e.target.value as "asc" | "desc")
                    }
                    className="bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer hover:text-primary transition-colors uppercase text-xs w-full sm:w-auto"
                  >
                    <option value="asc">Ordenar (A-Z)</option>
                    <option value="desc">Ordenar (Z-A)</option>
                  </select>
                </th>
                <th className="px-6 py-3 border-b border-border text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-semibold text-foreground uppercase text-xs whitespace-nowrap">
                      Rol:
                    </span>
                    <select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-transparent text-foreground focus:outline-none cursor-pointer hover:text-primary transition-colors text-xs font-medium text-right"
                    >
                      <option value="all">Todos</option>
                      {availableRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
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
                          className="bg-muted/30 px-6 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-y border-border/50"
                        >
                          {firstLetter}
                        </td>
                      </tr>
                    )}
                    <tr
                      onClick={() => handleUserClick(userItem.id)}
                      className="group hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-3 font-medium group-hover:text-primary transition-colors border-b border-border/40">
                        {userItem.nombre || "Sin Nombre"}
                      </td>
                      <td className="px-6 py-3 border-b border-border/40 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Shield className="h-3.5 w-3.5 text-primary" />
                          <span className="capitalize text-xs font-medium bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                            {userItem.rol || "user"}
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
      </div>

      <VerPerfil
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userId={selectedUserId}
      />

      <SignUp isOpen={isSignUpOpen} onClose={handleCloseSignUp} />
    </>
  );
}