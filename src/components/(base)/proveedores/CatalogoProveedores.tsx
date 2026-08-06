"use client";

import { useState } from "react";
import { Search, Plus, Phone, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Proveedor } from "./types";
import { ProveedorDetalle, formatPhoneDisplay, getWhatsappUrl } from "./forms/ProveedorDetalle";
import { cn } from "@/lib/utils";
import Swal from "sweetalert2";
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

  const getSwalThemeOpts = () => {
    const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    return {
      background: isDark ? "#18181b" : "#F5F5F1",
      color: isDark ? "#F5F5F1" : "#525D53",
      confirmButtonColor: "#8DA78E",
      cancelButtonColor: "#525D53",
      customClass: { popup: "!rounded-3xl border-0" }
    };
  };

  const handleEliminarProveedor = async (id: string, nombre: string) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar Proveedor?",
      text: `¿Seguro que deseas eliminar a ${nombre}? Esta acción no se puede deshacer si tiene registros asociados.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      ...getSwalThemeOpts(),
      confirmButtonColor: "#ef4444"
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await eliminarProveedor(id);
      if (!res.success) throw new Error(res.code || "Error");

      Swal.fire({
        title: "Eliminado",
        text: "Proveedor eliminado exitosamente.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
        ...getSwalThemeOpts()
      });
      cargarDatos();
    } catch (e: any) {
      Swal.fire({
        title: "Error",
        text: e.message || "No se pudo eliminar el proveedor.",
        icon: "error",
        ...getSwalThemeOpts(),
        confirmButtonColor: "#ef4444"
      });
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

          <button
            onClick={() => setIsCrearOpen(true)}
            className="py-3 px-5 bg-[#8DA78E] text-[#F5F5F1] text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:bg-[#7a937b] shrink-0"
          >
            <Plus className="size-4" /> Nuevo Proveedor
          </button>
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProveedorSeleccionado(p);
                                setModoEdicionProveedor(true);
                              }}
                              className="px-3 py-1.5 bg-[#8DA78E]/10 hover:bg-[#8DA78E]/25 text-[#8DA78E] dark:text-[#A3BEB0] font-bold rounded-lg transition-colors cursor-pointer text-[10px] uppercase"
                            >
                              Editar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEliminarProveedor(p.id, p.nombre);
                              }}
                              className="px-3 py-1.5 bg-red-400 hover:bg-red-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-[10px] uppercase"
                            >
                              Eliminar
                            </button>
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProveedorSeleccionado(p);
                        setModoEdicionProveedor(true);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-[#8DA78E] hover:bg-[#8DA78E]/10 rounded-lg cursor-pointer transition-colors uppercase border border-[#8DA78E]/30"
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEliminarProveedor(p.id, p.nombre);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition-colors uppercase border border-red-200 dark:border-red-900/40"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
        </div>
      </div>

      {/* Panel de detalle de Proveedor */}
      <AnimatePresence>
        {proveedorSeleccionado && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProveedorSeleccionado(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-[calc(100%-2rem)] m-4 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col rounded-[2rem] overflow-hidden"
            >
              <div className="h-full">
                <ProveedorDetalle
                  proveedor={proveedorSeleccionado}
                  onClose={() => setProveedorSeleccionado(null)}
                  onUpdate={() => {
                    cargarDatos();
                    setProveedorSeleccionado(null);
                  }}
                  defaultEdit={modoEdicionProveedor}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
