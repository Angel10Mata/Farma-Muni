"use client";

import { useEffect, useState } from "react";
import {
  ModalField,
  ModalInput,
  ModalLabel,
  ModalSelect,
} from "@/components/ui/general-modal";
import type { Proveedor } from "@/components/(base)/proveedores/lib/zod";
import { modalActionMessage } from "@/components/ui/modal-toast";
import {
  useCrearProveedorYLaboratorio,
  useGuardarLaboratorioInventario,
} from "../lib/hooks";

export type ProveedorNuevoInline = {
  nombre: string;
  nit: string;
  telefono: string;
  correo: string;
};

type LaboratorioProveedorCrearFieldsProps = {
  proveedores: Proveedor[];
  proveedorPreseleccionadoId?: string | null;
  nombreLaboratorio: string;
  onNombreLaboratorioChange: (value: string) => void;
  proveedorId: string;
  onProveedorIdChange: (value: string) => void;
  modoProveedorNuevo: boolean;
  onModoProveedorNuevoChange: (value: boolean) => void;
  proveedorNuevo: ProveedorNuevoInline;
  onProveedorNuevoChange: (value: ProveedorNuevoInline) => void;
  errorProveedor?: string;
  errorLaboratorio?: string;
};

export function LaboratorioProveedorCrearFields({
  proveedores,
  proveedorPreseleccionadoId,
  nombreLaboratorio,
  onNombreLaboratorioChange,
  proveedorId,
  onProveedorIdChange,
  modoProveedorNuevo,
  onModoProveedorNuevoChange,
  proveedorNuevo,
  onProveedorNuevoChange,
  errorProveedor,
  errorLaboratorio,
}: LaboratorioProveedorCrearFieldsProps) {
  useEffect(() => {
    if (proveedorPreseleccionadoId && !proveedorId && !modoProveedorNuevo) {
      onProveedorIdChange(proveedorPreseleccionadoId);
    }
  }, [
    proveedorPreseleccionadoId,
    proveedorId,
    modoProveedorNuevo,
    onProveedorIdChange,
  ]);

  return (
    <div className="space-y-4">
      <ModalField>
        <ModalLabel htmlFor="lab-prov-nombre">Nombre del laboratorio *</ModalLabel>
        <ModalInput
          id="lab-prov-nombre"
          value={nombreLaboratorio}
          onChange={(e) => onNombreLaboratorioChange(e.target.value)}
        />
        {errorLaboratorio ? (
          <p className="text-xs font-bold text-red-500">{errorLaboratorio}</p>
        ) : null}
      </ModalField>

      <ModalField>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ModalLabel htmlFor="lab-prov-select">Proveedor (opcional)</ModalLabel>
          <button
            type="button"
            className="text-xs font-bold text-[#2c5f9b] underline dark:text-[#6f9fd4]"
            onClick={() => onModoProveedorNuevoChange(!modoProveedorNuevo)}
          >
            {modoProveedorNuevo ? "Usar proveedor existente" : "Crear proveedor nuevo"}
          </button>
        </div>
        {modoProveedorNuevo ? (
          <div className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <ModalField>
              <ModalLabel htmlFor="lab-prov-nuevo-nombre">Nombre comercial *</ModalLabel>
              <ModalInput
                id="lab-prov-nuevo-nombre"
                value={proveedorNuevo.nombre}
                onChange={(e) =>
                  onProveedorNuevoChange({ ...proveedorNuevo, nombre: e.target.value })
                }
              />
            </ModalField>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ModalField>
                <ModalLabel htmlFor="lab-prov-nuevo-nit">NIT</ModalLabel>
                <ModalInput
                  id="lab-prov-nuevo-nit"
                  value={proveedorNuevo.nit}
                  onChange={(e) =>
                    onProveedorNuevoChange({ ...proveedorNuevo, nit: e.target.value })
                  }
                />
              </ModalField>
              <ModalField>
                <ModalLabel htmlFor="lab-prov-nuevo-tel">Teléfono</ModalLabel>
                <ModalInput
                  id="lab-prov-nuevo-tel"
                  value={proveedorNuevo.telefono}
                  onChange={(e) =>
                    onProveedorNuevoChange({ ...proveedorNuevo, telefono: e.target.value })
                  }
                />
              </ModalField>
            </div>
            <ModalField>
              <ModalLabel htmlFor="lab-prov-nuevo-correo">Correo</ModalLabel>
              <ModalInput
                id="lab-prov-nuevo-correo"
                type="email"
                value={proveedorNuevo.correo}
                onChange={(e) =>
                  onProveedorNuevoChange({ ...proveedorNuevo, correo: e.target.value })
                }
              />
            </ModalField>
          </div>
        ) : (
          <ModalSelect
            id="lab-prov-select"
            value={proveedorId}
            onChange={(e) => onProveedorIdChange(e.target.value)}
          >
            <option value="">Sin proveedor</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </ModalSelect>
        )}
        {errorProveedor ? (
          <p className="text-xs font-bold text-red-500">{errorProveedor}</p>
        ) : null}
      </ModalField>
    </div>
  );
}

export function useLaboratorioProveedorCrearState(proveedorPreseleccionadoId?: string | null) {
  const [nombreLaboratorio, setNombreLaboratorio] = useState("");
  const [proveedorId, setProveedorId] = useState(proveedorPreseleccionadoId ?? "");
  const [modoProveedorNuevo, setModoProveedorNuevo] = useState(false);
  const [proveedorNuevo, setProveedorNuevo] = useState<ProveedorNuevoInline>({
    nombre: "",
    nit: "",
    telefono: "",
    correo: "",
  });

  const reset = () => {
    setNombreLaboratorio("");
    setProveedorId(proveedorPreseleccionadoId ?? "");
    setModoProveedorNuevo(false);
    setProveedorNuevo({ nombre: "", nit: "", telefono: "", correo: "" });
  };

  return {
    nombreLaboratorio,
    setNombreLaboratorio,
    proveedorId,
    setProveedorId,
    modoProveedorNuevo,
    setModoProveedorNuevo,
    proveedorNuevo,
    setProveedorNuevo,
    reset,
  };
}

export function useLaboratorioProveedorCrearMutations() {
  const { mutateAsync: guardarLaboratorio } = useGuardarLaboratorioInventario();
  const { mutateAsync: crearProveedorYLaboratorio } = useCrearProveedorYLaboratorio();

  const crear = async (params: {
    nombreLaboratorio: string;
    proveedorId: string;
    modoProveedorNuevo: boolean;
    proveedorNuevo: ProveedorNuevoInline;
  }): Promise<{ laboratorioId: string; proveedorId: string }> => {
    const nombre = params.nombreLaboratorio.trim();
    if (nombre.length < 2) {
      throw new Error("VALIDATION");
    }

    if (params.modoProveedorNuevo) {
      if (!params.proveedorNuevo.nombre.trim()) {
        throw new Error("VALIDATION");
      }
      try {
        const res = await crearProveedorYLaboratorio({
          proveedor: {
            nombre: params.proveedorNuevo.nombre.trim(),
            nit: params.proveedorNuevo.nit.trim() || null,
            telefono: params.proveedorNuevo.telefono.trim() || null,
            correo: params.proveedorNuevo.correo.trim() || null,
            descripcion: null,
          },
          laboratorio: { nombre, activo: true },
        });
        return {
          laboratorioId: res.laboratorio_id,
          proveedorId: res.proveedor_id,
        };
      } catch (err) {
        const e = err as Error & { detail?: string };
        throw new Error(modalActionMessage(e.message, e.detail ?? "No se pudo crear."));
      }
    }

    try {
      const res = await guardarLaboratorio({
        data: {
          nombre,
          activo: true,
          proveedor_id: params.proveedorId ? params.proveedorId : null,
        },
      });
      return {
        laboratorioId: res.id,
        proveedorId: params.proveedorId || "",
      };
    } catch (err) {
      const e = err as Error & { detail?: string };
      throw new Error(modalActionMessage(e.message, e.detail ?? "No se pudo crear."));
    }
  };

  return { crear };
}
