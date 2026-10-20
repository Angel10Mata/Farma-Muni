"use client";

import { useState } from "react";
import { Ban, Mail, MoreVertical, Pencil, Phone, Power, Search, Trash2 } from "lucide-react";
import { Check as CheckNode, UserPlus as UserPlusNode } from "lucide";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { Proveedor } from "./lib/zod";
import { VerProveedor, formatPhoneDisplay, getWhatsappUrl } from "./forms/VerProveedor";
import { cn, getSwalThemeOpts } from "@/lib/utils";
import { moduleControlsShellClass } from "@/lib/module-layout";
import { modalActionMessage } from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { eliminarProveedor, setProveedorActivo } from "./lib/actions";
import { puedeEliminarProveedor } from "./lib/proveedores-permissions";
import { useUserContext } from "@/components/(base)/providers/UserProvider";
import {
  moduleTableBodyClass,
  moduleTableCellClass,
  moduleTableClass,
  moduleTableDesktopScrollClass,
  moduleTableDesktopWrapClass,
  moduleTableEmptyCellClass,
  ModuleTableFooter,
  moduleTableHeadCellClass,
  moduleTableHeadRowClass,
  moduleTableRowClass,
  moduleTableScrollClass,
  moduleTableSearchClass,
  moduleTableShellClass,
} from "@/components/ui/module-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function ProveedorCatalogoAccionesMenu({
  proveedor,
  puedeEliminar,
  onEditar,
  onEliminar,
  onToggleActivo,
}: {
  proveedor: Proveedor;
  puedeEliminar: boolean;
  onEditar: () => void;
  onEliminar: () => void;
  onToggleActivo: () => void;
}) {
  const activo = proveedor.activo !== false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Acciones de ${proveedor.nombre}`}
          className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-texto-tenue transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <MoreVertical className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[250] min-w-[11rem] rounded-xl border border-zinc-200 bg-white p-1.5 text-zinc-800 opacity-100 shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <DropdownMenuItem
          className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-zinc-800 focus:bg-zinc-100 focus:text-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-800 dark:focus:text-white"
          onSelect={onEditar}
        >
          <Pencil className="size-3.5 shrink-0 text-texto-tenue" />
          Editar
        </DropdownMenuItem>
        {puedeEliminar ? (
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold focus:bg-rose-50 focus:text-rose-700 dark:focus:bg-rose-950/40 dark:focus:text-rose-300"
            onSelect={onEliminar}
          >
            <Trash2 className="size-3.5 shrink-0" />
            Quitar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-zinc-800 focus:bg-zinc-100 focus:text-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-800 dark:focus:text-white"
            onSelect={onToggleActivo}
          >
            {activo ? (
              <Ban className="size-3.5 shrink-0 text-texto-tenue" />
            ) : (
              <Power className="size-3.5 shrink-0 text-texto-tenue" />
            )}
            {activo ? "Inactivar" : "Activar"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Props
interface CatalogoProveedoresProps {
  proveedores: Proveedor[];
  mensajeListaVacia?: string | null;
  cargarDatos: () => void;
  setIsCrearOpen: (open: boolean) => void;
}

// Proveedores
export function CatalogoProveedores({
  proveedores,
  mensajeListaVacia = null,
  cargarDatos,
  setIsCrearOpen,
}: CatalogoProveedoresProps) {
  // Estado
  const [proveedorBusqueda, setProveedorBusqueda] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
  const [modoEdicionProveedor, setModoEdicionProveedor] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const { realRole } = useUserContext();
  const puedeEliminar = puedeEliminarProveedor(realRole);

  const handleEliminarProveedor = async (id: string, nombre: string) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar Proveedor?",
      text: `¿Seguro que deseas eliminar a ${nombre}? Esta acción no se puede deshacer si tiene registros asociados.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      ...getSwalThemeOpts(),
      confirmButtonColor: "#ef4444",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await eliminarProveedor(id);
      if (!res.success) throw new Error(res.code || "Error");

      toast.success("Proveedor eliminado correctamente.");
      cargarDatos();
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : undefined;
      toast.error(modalActionMessage(code, "No se pudo eliminar el proveedor."));
    }
  };

  const handleToggleProveedorActivo = async (
    id: string,
    nombre: string,
    activoActual: boolean,
  ) => {
    const siguiente = !activoActual;
    const confirm = await Swal.fire({
      title: siguiente ? "¿Activar proveedor?" : "¿Desactivar proveedor?",
      text: siguiente
        ? `${nombre} volverá a aparecer en compras nuevas.`
        : `${nombre} dejará de aparecer en compras nuevas. No se eliminarán sus registros.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: siguiente ? "Sí, activar" : "Sí, desactivar",
      cancelButtonText: "Cancelar",
      ...getSwalThemeOpts(),
      confirmButtonColor: siguiente ? "#2E9E77" : "#CC5C5C",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await setProveedorActivo(id, siguiente);
      if (!res.success) throw new Error(res.code || "Error");
      toast.success(siguiente ? "Proveedor activado." : "Proveedor desactivado.");
      cargarDatos();
      if (proveedorSeleccionado?.id === id && !siguiente) {
        setProveedorSeleccionado(null);
      }
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : undefined;
      toast.error(modalActionMessage(code, "No se pudo actualizar el estado del proveedor."));
    }
  };

  const proveedoresFiltrados = proveedores.filter((p) => {
    const q = proveedorBusqueda.toLowerCase();
    return (p.nombre || "").toLowerCase().includes(q) || (p.nit && p.nit.toLowerCase().includes(q));
  });

  const sinResultadosBusqueda =
    proveedores.length > 0 && proveedoresFiltrados.length === 0 && proveedorBusqueda.trim() !== "";
  const textoListaVacia =
    sinResultadosBusqueda
      ? "Ningún proveedor coincide con la búsqueda."
      : mensajeListaVacia ?? "No se encontraron proveedores";

  const totalPages = Math.ceil(proveedoresFiltrados.length / pageSize) || 1;
  const proveedoresPaginados = proveedoresFiltrados.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="flex gap-4 flex-1 relative min-h-[550px] overflow-x-hidden p-1">
      <div className="flex min-h-0 flex-1 flex-col gap-4 min-w-0">
        <section
          className={cn(
            moduleControlsShellClass,
            "relative z-30 shrink-0 overflow-visible p-3 md:p-4",
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative w-full min-w-0 flex-1 text-left">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-look-2-salvia-menta/70" />
              <input
                type="text"
                value={proveedorBusqueda}
                onChange={(e) => {
                  setProveedorBusqueda(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar proveedor por nombre o NIT..."
                className={cn(moduleTableSearchClass, "py-2 pl-9")}
              />
            </div>

            <SigetActionButton
              label="Nuevo"
              accentColor={sigetAccent.crear}
              morphFrom={UserPlusNode}
              morphTo={CheckNode}
              onClick={() => setIsCrearOpen(true)}
              ariaLabel="Nuevo proveedor"
              className="w-full shrink-0 sm:w-auto"
            />
          </div>
        </section>

          <div className={moduleTableShellClass}>
          <div className={cn(moduleTableScrollClass, "min-h-0 pr-1")}>
          {/* Tabla de Proveedores (Desktop) */}
          <div className={moduleTableDesktopWrapClass}>
            <div className={moduleTableDesktopScrollClass}>
              <table className={moduleTableClass}>
                <thead>
                  <tr className={moduleTableHeadRowClass}>
                    <th className={moduleTableHeadCellClass}>Nombre</th>
                    <th className={moduleTableHeadCellClass}>NIT</th>
                    <th className={moduleTableHeadCellClass}>Teléfono</th>
                    <th className={moduleTableHeadCellClass}>Correo</th>
                    <th className={moduleTableHeadCellClass}>Descripción</th>
                    <th className={cn(moduleTableHeadCellClass, "text-center")}>Acciones</th>
                  </tr>
                </thead>
                <tbody className={moduleTableBodyClass}>
                  {proveedoresPaginados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={cn(moduleTableEmptyCellClass, "max-w-md whitespace-normal")}>
                        {textoListaVacia}
                      </td>
                    </tr>
                  ) : (
                    proveedoresPaginados.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => {
                          const isSelected = proveedorSeleccionado?.id === p.id;
                          setProveedorSeleccionado(isSelected ? null : p);
                          setModoEdicionProveedor(false);
                        }}
                        className={cn(
                          "hover:bg-[#8DA78E]/10 dark:hover:bg-[#A3BEB0]/15 transition-all cursor-pointer",
                          proveedorSeleccionado?.id === p.id && "bg-[#8DA78E]/20 dark:bg-[#8DA78E]/25"
                        )}
                      >
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                          <span className="inline-flex flex-wrap items-center gap-2">
                            {p.nombre}
                            {p.activo === false ? (
                              <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-etiqueta font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                                Inactivo
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-texto-tenue">
                          {p.nit || <span className="text-slate-300">C/F</span>}
                        </td>
                        <td className="px-5 py-3.5 text-texto-tenue">
                          {p.telefono ? (
                            <a
                              href={getWhatsappUrl(p.telefono)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 hover:underline font-bold"
                            >
                              <Phone className="size-3" /> {formatPhoneDisplay(p.telefono)}
                            </a>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-texto-tenue">
                          {p.correo ? (
                            <span className="flex items-center gap-1.5">
                              <Mail className="size-3 text-look-2-salvia-menta" /> {p.correo}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 align-top text-texto-tenue min-w-[12rem] max-w-md whitespace-normal break-words">
                          {p.descripcion ? (
                            <span className="block italic leading-snug">{p.descripcion}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td
                          className="px-3 py-3.5 w-14 align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-center">
                            <ProveedorCatalogoAccionesMenu
                              proveedor={p}
                              puedeEliminar={puedeEliminar}
                              onEditar={() => {
                                setProveedorSeleccionado(p);
                                setModoEdicionProveedor(true);
                              }}
                              onEliminar={() => handleEliminarProveedor(p.id, p.nombre)}
                              onToggleActivo={() =>
                                handleToggleProveedorActivo(
                                  p.id,
                                  p.nombre,
                                  p.activo !== false,
                                )
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col gap-3">
            {proveedoresPaginados.length === 0 ? (
              <div className="py-10 px-4 text-center text-slate-500 font-bold text-sm leading-relaxed bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl">
                {textoListaVacia}
              </div>
            ) : (
              proveedoresPaginados.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setProveedorSeleccionado(p);
                    setModoEdicionProveedor(false);
                  }}
                  className={cn(
                    "bg-white dark:bg-[#525D53]/10 border border-[#C1D1C5]/40 dark:border-[#A3BEB0]/10 rounded-2xl p-4 flex flex-col gap-3 shadow-xs cursor-pointer hover:border-[#8DA78E] transition-all",
                    proveedorSeleccionado?.id === p.id && "border-[#8DA78E] ring-1 ring-[#8DA78E]/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white inline-flex flex-wrap items-center gap-2">
                        {p.nombre}
                        {p.activo === false ? (
                          <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-etiqueta font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                            Inactivo
                          </span>
                        ) : null}
                      </h4>
                      <p className="text-etiqueta text-texto-tenue mt-0.5">NIT: {p.nit || "C/F"}</p>
                    </div>
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <ProveedorCatalogoAccionesMenu
                        proveedor={p}
                        puedeEliminar={puedeEliminar}
                        onEditar={() => {
                          setProveedorSeleccionado(p);
                          setModoEdicionProveedor(true);
                        }}
                        onEliminar={() => handleEliminarProveedor(p.id, p.nombre)}
                        onToggleActivo={() =>
                          handleToggleProveedorActivo(p.id, p.nombre, p.activo !== false)
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-texto-tenue">
                    {p.telefono && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="size-3.5 text-look-2-salvia-menta shrink-0" />
                        <a
                          href={getWhatsappUrl(p.telefono)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-green-600 dark:text-green-400 hover:underline font-bold"
                        >
                          {formatPhoneDisplay(p.telefono)}
                        </a>
                      </p>
                    )}
                    {p.correo && (
                      <p className="flex items-center gap-1.5 truncate"><Mail className="size-3.5 text-look-2-salvia-menta" /> {p.correo}</p>
                    )}
                  </div>
                  {p.descripcion ? (
                    <p className="text-xs italic leading-snug text-texto-tenue whitespace-normal break-words">
                      {p.descripcion}
                    </p>
                  ) : null}
                </div>
              ))
            )}
        </div>
          </div>

          <ModuleTableFooter
            itemCount={proveedoresFiltrados.length}
            pageSize={pageSize}
            pageSizeOptions={[15, 30, 45]}
            setPageSize={setPageSize}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
          </div>
      </div>

      {proveedorSeleccionado ? (
        <VerProveedor
          proveedor={proveedorSeleccionado}
          onClose={() => setProveedorSeleccionado(null)}
          onUpdate={() => {
            cargarDatos();
            setProveedorSeleccionado(null);
          }}
          defaultEdit={modoEdicionProveedor}
        />
      ) : null}
    </div>
  );
}
