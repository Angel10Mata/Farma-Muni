"use client";

import { useState } from "react";
import { Search, Phone, Mail } from "lucide-react";
import { Check as CheckNode, Pencil as PencilNode, SquarePen as SquarePenNode, Trash as TrashNode, Trash2 as Trash2Node, UserPlus as UserPlusNode } from "lucide";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { Proveedor } from "./lib/zod";
import { VerProveedor, formatPhoneDisplay, getWhatsappUrl } from "./forms/VerProveedor";
import { cn, getSwalThemeOpts } from "@/lib/utils";
import { modalActionMessage } from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { eliminarProveedor } from "./lib/actions";

interface CatalogoProveedoresProps {
  proveedores: Proveedor[];
  cargarDatos: () => void;
  setIsCrearOpen: (open: boolean) => void;
}

export function CatalogoProveedores({ proveedores, cargarDatos, setIsCrearOpen }: CatalogoProveedoresProps) {
  const [proveedorBusqueda, setProveedorBusqueda] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
  const [modoEdicionProveedor, setModoEdicionProveedor] = useState(false);

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

  const proveedoresFiltrados = proveedores.filter((p) => {
    const q = proveedorBusqueda.toLowerCase();
    return (p.nombre || "").toLowerCase().includes(q) || (p.nit && p.nit.toLowerCase().includes(q));
  });

  return (
    <div className="flex gap-4 flex-1 relative min-h-[550px] overflow-x-hidden p-1">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between px-1">
          {/* Buscador */}
          <div className="relative w-full sm:max-w-xl text-left">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={proveedorBusqueda}
              onChange={(e) => setProveedorBusqueda(e.target.value)}
              placeholder="Buscar proveedor por nombre o NIT..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl border-none bg-white dark:bg-zinc-900/60 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8DA78E]/30 transition-all shadow-sm"
            />
          </div>

          <SigetActionButton
            label="Nuevo"
            accentColor={sigetAccent.crear}
            morphFrom={UserPlusNode}
            morphTo={CheckNode}
            onClick={() => setIsCrearOpen(true)}
            ariaLabel="Nuevo proveedor"
            className="w-auto shrink-0"
          />
        </div>

          {/* Tabla de Proveedores (Desktop) */}
          <div className="hidden md:block bg-white dark:bg-[#525D53]/10 border border-[#C1D1C5]/40 dark:border-[#A3BEB0]/10 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                    <th className="px-5 py-3.5">Nombre</th>
                    <th className="px-5 py-3.5">NIT</th>
                    <th className="px-5 py-3.5">Teléfono</th>
                    <th className="px-5 py-3.5">Correo</th>
                    <th className="px-5 py-3.5">Descripción</th>
                    <th className="px-5 py-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
                  {proveedoresFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-14 text-slate-400 font-bold">
                        No se encontraron proveedores
                      </td>
                    </tr>
                  ) : (
                    proveedoresFiltrados.map((p) => (
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
                          {p.nombre}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-500 dark:text-slate-400">
                          {p.nit || <span className="text-slate-300 dark:text-slate-600">C/F</span>}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
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
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                          {p.correo ? (
                            <span className="flex items-center gap-1.5">
                              <Mail className="size-3 text-[#8DA78E]" /> {p.correo}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 max-w-[200px]">
                          {p.descripcion ? (
                            <span className="line-clamp-1 italic">{p.descripcion}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <SigetActionButton
                              label="Editar"
                              accentColor={sigetAccent.editar}
                              morphFrom={PencilNode}
                              morphTo={SquarePenNode}
                              onClick={() => {
                                setProveedorSeleccionado(p);
                                setModoEdicionProveedor(true);
                              }}
                              className="w-auto shrink-0"
                            />
                            <SigetActionButton
                              label="Quitar"
                              accentColor={sigetAccent.quitar}
                              morphFrom={TrashNode}
                              morphTo={Trash2Node}
                              onClick={() => handleEliminarProveedor(p.id, p.nombre)}
                              className="w-auto shrink-0"
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
            {proveedoresFiltrados.length === 0 ? (
              <div className="py-10 text-center text-slate-400 font-bold text-sm bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl">
                No se encontraron proveedores
              </div>
            ) : (
              proveedoresFiltrados.map((p) => (
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
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{p.nombre}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">NIT: {p.nit || "C/F"}</p>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                    {p.telefono && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="size-3.5 text-[#8DA78E] shrink-0" />
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
                      <p className="flex items-center gap-1.5 truncate"><Mail className="size-3.5 text-[#8DA78E]" /> {p.correo}</p>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-zinc-800" onClick={(e) => e.stopPropagation()}>
                    <SigetActionButton
                      label="Editar"
                      accentColor={sigetAccent.editar}
                      morphFrom={PencilNode}
                      morphTo={SquarePenNode}
                      onClick={() => {
                        setProveedorSeleccionado(p);
                        setModoEdicionProveedor(true);
                      }}
                      className="w-auto shrink-0"
                    />
                    <SigetActionButton
                      label="Quitar"
                      accentColor={sigetAccent.quitar}
                      morphFrom={TrashNode}
                      morphTo={Trash2Node}
                      onClick={() => handleEliminarProveedor(p.id, p.nombre)}
                      className="w-auto shrink-0"
                    />
                  </div>
                </div>
              ))
            )}
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
