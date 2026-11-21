"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { normalizarTextoBusquedaProducto } from "@/components/(base)/inventario/lib/helpers";
import { FlaskConical, Link2Off, MoreVertical, Pencil, Power } from "lucide-react";
import { Plus, Save, X } from "lucide";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModalField, ModalInput, ModalLabel } from "@/components/ui/general-modal";
import { modalActionMessage } from "@/components/ui/modal-toast";
import type { InvLaboratorio } from "@/components/(base)/inventario/lib/jerarquia-zod";
import {
  useDesligarLaboratorioProveedor,
  useGuardarLaboratorioInventario,
  useLaboratoriosInventario,
  useLaboratoriosPorProveedor,
} from "@/components/(base)/inventario/lib/hooks";
import type { Proveedor } from "./lib/zod";

type ProveedorLaboratoriosSectionProps = {
  proveedor: Proveedor;
};

export function ProveedorLaboratoriosSection({ proveedor }: ProveedorLaboratoriosSectionProps) {
  const { data: laboratorios = [], isLoading } = useLaboratoriosPorProveedor(proveedor.id);
  const { data: todosLaboratorios = [] } = useLaboratoriosInventario();
  const { mutateAsync: guardarLaboratorio, isPending: guardando } =
    useGuardarLaboratorioInventario();
  const { mutateAsync: desligar, isPending: desligando } = useDesligarLaboratorioProveedor();

  const [mostrarFormCrear, setMostrarFormCrear] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [mostrarSugerenciasLab, setMostrarSugerenciasLab] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const labFormRef = useRef<HTMLDivElement>(null);

  const idsVinculadosProveedor = useMemo(
    () => new Set(laboratorios.map((l) => l.id)),
    [laboratorios],
  );

  const sugerenciasLaboratorios = useMemo(() => {
    const q = normalizarTextoBusquedaProducto(nombreNuevo.trim());
    if (!q) return [];
    return todosLaboratorios
      .filter((lab) => normalizarTextoBusquedaProducto(lab.nombre).includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .slice(0, 10);
  }, [todosLaboratorios, nombreNuevo]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (labFormRef.current && !labFormRef.current.contains(event.target as Node)) {
        setMostrarSugerenciasLab(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cerrarFormCrear = () => {
    setMostrarFormCrear(false);
    setNombreNuevo("");
    setMostrarSugerenciasLab(false);
  };

  const vincularLaboratorioExistente = async (lab: InvLaboratorio) => {
    if (idsVinculadosProveedor.has(lab.id)) {
      toast.info("Este laboratorio ya está vinculado a este proveedor.");
      cerrarFormCrear();
      return;
    }
    try {
      await guardarLaboratorio({
        id: lab.id,
        data: {
          nombre: lab.nombre,
          activo: lab.activo,
          proveedor_id: proveedor.id,
        },
      });
      toast.success("Laboratorio vinculado al proveedor.");
      cerrarFormCrear();
    } catch (err) {
      const e = err as Error & { detail?: string };
      toast.error(modalActionMessage(e.message, e.detail ?? "No se pudo vincular el laboratorio."));
    }
  };

  const handleCrear = async () => {
    const nombre = nombreNuevo.trim();
    if (nombre.length < 2) {
      toast.warn("Indica el nombre del laboratorio.");
      return;
    }
    const needle = normalizarTextoBusquedaProducto(nombre);
    const existente = todosLaboratorios.find(
      (lab) => normalizarTextoBusquedaProducto(lab.nombre) === needle,
    );
    if (existente) {
      await vincularLaboratorioExistente(existente);
      return;
    }
    try {
      await guardarLaboratorio({
        data: { nombre, activo: true, proveedor_id: proveedor.id },
      });
      toast.success("Laboratorio creado y vinculado al proveedor.");
      cerrarFormCrear();
    } catch (err) {
      const e = err as Error & { detail?: string };
      toast.error(modalActionMessage(e.message, e.detail ?? "No se pudo crear el laboratorio."));
    }
  };

  const iniciarEdicion = (lab: InvLaboratorio) => {
    setEditId(lab.id);
    setEditNombre(lab.nombre);
  };

  const guardarEdicion = async (lab: InvLaboratorio) => {
    const nombre = editNombre.trim();
    if (nombre.length < 2) {
      toast.warn("Nombre inválido.");
      return;
    }
    try {
      await guardarLaboratorio({
        id: lab.id,
        data: {
          nombre,
          activo: lab.activo,
          proveedor_id: proveedor.id,
        },
      });
      toast.success("Laboratorio actualizado.");
      setEditId(null);
    } catch (err) {
      const e = err as Error & { detail?: string };
      toast.error(modalActionMessage(e.message, e.detail ?? "No se pudo guardar."));
    }
  };

  const toggleActivo = async (lab: InvLaboratorio) => {
    try {
      await guardarLaboratorio({
        id: lab.id,
        data: {
          nombre: lab.nombre,
          activo: !lab.activo,
          proveedor_id: proveedor.id,
        },
      });
      toast.success(lab.activo ? "Laboratorio desactivado." : "Laboratorio activado.");
    } catch (err) {
      const e = err as Error & { detail?: string };
      toast.error(modalActionMessage(e.message, e.detail ?? "No se pudo guardar."));
    }
  };

  const handleDesligar = async (labId: string) => {
    try {
      await desligar({ laboratorioId: labId, proveedorId: proveedor.id });
      toast.success("Laboratorio desligado del proveedor.");
    } catch {
      toast.error("No se pudo desligar el laboratorio.");
    }
  };

  const busy = guardando || desligando;

  return (
    <div className="space-y-4 border-t border-[#C1D1C5]/20 pt-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="flex min-w-0 items-center gap-2 text-xs font-black uppercase tracking-widest text-[#525D53] dark:text-look-1-salvia-suave/70">
          <FlaskConical className="size-4 shrink-0 text-look-2-salvia-menta" />
          Laboratorios
        </h4>
        {!mostrarFormCrear ? (
          <SigetActionButton
            label="Crear"
            accentColor={sigetAccent.crear}
            morphFrom={Plus}
            morphTo={Plus}
            type="button"
            onClick={() => setMostrarFormCrear(true)}
            disabled={busy}
            className="w-auto shrink-0"
          />
        ) : null}
      </div>

      {mostrarFormCrear ? (
        <div
          ref={labFormRef}
          className="rounded-xl border border-[#C1D1C5]/30 bg-zinc-50/80 p-4 dark:border-[#A3BEB0]/10 dark:bg-zinc-900/40"
        >
          <ModalField className="relative">
            <ModalLabel htmlFor={`lab-nuevo-${proveedor.id}`}>
              Buscar o crear laboratorio
            </ModalLabel>
            <ModalInput
              id={`lab-nuevo-${proveedor.id}`}
              value={nombreNuevo}
              onChange={(e) => {
                setNombreNuevo(e.target.value);
                setMostrarSugerenciasLab(true);
              }}
              onFocus={() => setMostrarSugerenciasLab(true)}
              placeholder="Nombre del laboratorio"
              autoFocus
            />
            <AnimatePresence>
              {mostrarSugerenciasLab && nombreNuevo.trim() && sugerenciasLaboratorios.length > 0 ? (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 right-0 top-full z-[260] mt-1 max-h-48 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {sugerenciasLaboratorios.map((lab) => {
                    const yaVinculado = idsVinculadosProveedor.has(lab.id);
                    const otroProveedor =
                      lab.proveedor_id &&
                      lab.proveedor_id !== proveedor.id &&
                      lab.proveedor_nombre;
                    return (
                      <li key={lab.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => void vincularLaboratorioExistente(lab)}
                          className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <p className="font-bold text-slate-900 dark:text-slate-100">{lab.nombre}</p>
                          <p className="text-etiqueta text-texto-tenue mt-0.5">
                            {yaVinculado
                              ? "Ya vinculado a este proveedor"
                              : otroProveedor
                                ? `Proveedor actual: ${lab.proveedor_nombre}`
                                : lab.proveedor_id === proveedor.id
                                  ? "Vinculado a este proveedor"
                                  : "Sin proveedor · clic para vincular"}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </motion.ul>
              ) : null}
            </AnimatePresence>
          </ModalField>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <SigetActionButton
              label="Cancelar"
              accentColor={sigetAccent.cancelar}
              morphFrom={X}
              morphTo={X}
              type="button"
              onClick={cerrarFormCrear}
              disabled={busy}
              className="w-auto shrink-0"
            />
            <SigetActionButton
              label="Crear"
              accentColor={sigetAccent.guardar}
              morphFrom={Plus}
              morphTo={Plus}
              type="button"
              onClick={() => void handleCrear()}
              disabled={busy}
              className="w-auto shrink-0"
            />
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando laboratorios…</p>
      ) : laboratorios.length === 0 ? (
        <p className="text-sm text-slate-500">Este proveedor aún no tiene laboratorios.</p>
      ) : (
        <ul className="space-y-2">
          {laboratorios.map((lab) => (
            <li
              key={lab.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/60"
            >
              {editId === lab.id ? (
                <div className="min-w-[200px] flex-1 space-y-2.5">
                  <ModalLabel className="sr-only">Nombre</ModalLabel>
                  <ModalInput
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                  />
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-800 dark:text-slate-100">
                    {lab.nombre}
                  </p>
                  <p className="text-etiqueta font-bold uppercase text-texto-tenue">
                    {lab.activo ? "Activo" : "Inactivo"}
                  </p>
                </div>
              )}
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {editId === lab.id ? (
                  <>
                    <SigetActionButton
                      label="Guardar"
                      accentColor={sigetAccent.guardar}
                      morphFrom={Save}
                      morphTo={Save}
                      type="button"
                      onClick={() => void guardarEdicion(lab)}
                      disabled={busy}
                      className="w-auto shrink-0"
                    />
                    <SigetActionButton
                      label="Cancelar"
                      accentColor={sigetAccent.cancelar}
                      morphFrom={X}
                      morphTo={X}
                      type="button"
                      onClick={() => setEditId(null)}
                      disabled={busy}
                      className="w-auto shrink-0"
                    />
                  </>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Acciones del laboratorio"
                        disabled={busy}
                        className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
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
                        onSelect={() => iniciarEdicion(lab)}
                      >
                        <Pencil className="size-3.5 shrink-0 text-texto-tenue" />
                        Editar nombre
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-zinc-800 focus:bg-zinc-100 focus:text-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-800 dark:focus:text-white"
                        onSelect={() => void toggleActivo(lab)}
                      >
                        <Power className="size-3.5 shrink-0 text-texto-tenue" />
                        {lab.activo ? "Desactivar" : "Activar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold focus:bg-rose-50 focus:text-rose-700 dark:focus:bg-rose-950/40 dark:focus:text-rose-300"
                        onSelect={() => void handleDesligar(lab.id)}
                      >
                        <Link2Off className="size-3.5 shrink-0" />
                        Desligar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
