"use client";

import { useState } from "react";
import { toast } from "react-toastify";
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
  useLaboratoriosPorProveedor,
} from "@/components/(base)/inventario/lib/hooks";
import type { Proveedor } from "./lib/zod";

type ProveedorLaboratoriosSectionProps = {
  proveedor: Proveedor;
};

export function ProveedorLaboratoriosSection({ proveedor }: ProveedorLaboratoriosSectionProps) {
  const { data: laboratorios = [], isLoading } = useLaboratoriosPorProveedor(proveedor.id);
  const { mutateAsync: guardarLaboratorio, isPending: guardando } =
    useGuardarLaboratorioInventario();
  const { mutateAsync: desligar, isPending: desligando } = useDesligarLaboratorioProveedor();

  const [mostrarFormCrear, setMostrarFormCrear] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");

  const handleCrear = async () => {
    const nombre = nombreNuevo.trim();
    if (nombre.length < 2) {
      toast.warn("Indica el nombre del laboratorio.");
      return;
    }
    try {
      await guardarLaboratorio({
        data: { nombre, activo: true, proveedor_id: proveedor.id },
      });
      toast.success("Laboratorio creado y vinculado al proveedor.");
      setNombreNuevo("");
      setMostrarFormCrear(false);
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
        <h4 className="flex min-w-0 items-center gap-2 text-xs font-black uppercase tracking-widest text-[#525D53] dark:text-[#A3BEB0]/70">
          <FlaskConical className="size-4 shrink-0 text-[#8DA78E]" />
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
        <div className="rounded-xl border border-[#C1D1C5]/30 bg-zinc-50/80 p-4 dark:border-[#A3BEB0]/10 dark:bg-zinc-900/40">
          <ModalField>
            <ModalLabel htmlFor={`lab-nuevo-${proveedor.id}`}>Nuevo laboratorio</ModalLabel>
            <ModalInput
              id={`lab-nuevo-${proveedor.id}`}
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              placeholder="Nombre del laboratorio"
              autoFocus
            />
          </ModalField>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <SigetActionButton
              label="Cancelar"
              accentColor={sigetAccent.cancelar}
              morphFrom={X}
              morphTo={X}
              type="button"
              onClick={() => {
                setMostrarFormCrear(false);
                setNombreNuevo("");
              }}
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
                  <p className="text-[10px] font-bold uppercase text-slate-400">
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
                        className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
                        <Pencil className="size-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                        Editar nombre
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-zinc-800 focus:bg-zinc-100 focus:text-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-800 dark:focus:text-white"
                        onSelect={() => void toggleActivo(lab)}
                      >
                        <Power className="size-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
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
