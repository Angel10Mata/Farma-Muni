"use client";

import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  ModalField,
  ModalFooter,
  ModalForm,
  ModalInput,
  ModalLabel,
  ModalSelect,
  ModalShell,
  ModalSubmit,
} from "@/components/ui/general-modal";
import { modalActionMessage } from "@/components/ui/modal-toast";
import {
  useCatalogosInventario,
  useGenericosInventario,
  useGuardarComercialInventario,
  useLaboratoriosInventario,
} from "@/components/(base)/inventario/lib/hooks";
import type { ComercialCompra } from "../lib/zod";

interface NuevoComercialCompraModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (comercial: ComercialCompra) => void;
}

export function NuevoComercialCompraModal({
  open,
  onClose,
  onCreated,
}: NuevoComercialCompraModalProps) {
  const [catalogoId, setCatalogoId] = useState("");
  const [genericoId, setGenericoId] = useState("");
  const [laboratorioId, setLaboratorioId] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");

  const { data: catalogos = [] } = useCatalogosInventario();
  const { data: genericos = [] } = useGenericosInventario(
    catalogoId ? { catalogo_id: catalogoId } : undefined,
  );
  const { data: laboratorios = [] } = useLaboratoriosInventario();
  const { mutateAsync: guardarComercial, isPending } = useGuardarComercialInventario();

  const genericoSeleccionado = useMemo(
    () => genericos.find((g) => g.generico_id === genericoId),
    [genericos, genericoId],
  );
  const catalogoSeleccionado = useMemo(
    () => catalogos.find((c) => c.id === catalogoId),
    [catalogos, catalogoId],
  );
  const laboratorioSeleccionado = useMemo(
    () => laboratorios.find((l) => l.id === laboratorioId),
    [laboratorios, laboratorioId],
  );

  const reset = () => {
    setCatalogoId("");
    setGenericoId("");
    setLaboratorioId("");
    setNombreComercial("");
    setPresentacion("");
    setPrecioVenta("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const precio = Number(precioVenta);
    if (!genericoId || !laboratorioId) {
      toast.warn("Selecciona genérico y laboratorio.");
      return;
    }
    if (!nombreComercial.trim() || !presentacion.trim()) {
      toast.warn("Nombre comercial y presentación son obligatorios.");
      return;
    }
    if (!precio || precio < 0 || Number.isNaN(precio)) {
      toast.warn("Ingresa un precio de venta válido.");
      return;
    }

    let res: { success: true; id: string };
    try {
      res = await guardarComercial({
        data: {
          generico_id: genericoId,
          laboratorio_id: laboratorioId,
          nombre_comercial: nombreComercial.trim(),
          presentacion: presentacion.trim(),
          precio_venta: precio,
          activo: true,
        },
      });
    } catch (err) {
      const e = err as Error & { message?: string; detail?: string };
      toast.error(modalActionMessage(e.message ?? "ERROR", e.detail ?? "No se pudo crear el comercial."));
      return;
    }

    const id = res.id;
    if (!id || !genericoSeleccionado || !catalogoSeleccionado || !laboratorioSeleccionado) {
      toast.success("Producto comercial creado.");
      reset();
      onClose();
      return;
    }

    onCreated({
      id,
      nombre_comercial: nombreComercial.trim(),
      presentacion: presentacion.trim(),
      precio_venta: precio,
      activo: true,
      catalogo_id: catalogoSeleccionado.id,
      catalogo_nombre: catalogoSeleccionado.nombre,
      generico_id: genericoSeleccionado.generico_id,
      generico_nombre: genericoSeleccionado.generico_nombre,
      concentracion: genericoSeleccionado.concentracion,
      forma_farmaceutica: String(genericoSeleccionado.forma_farmaceutica),
      laboratorio_id: laboratorioSeleccionado.id,
      laboratorio_nombre: laboratorioSeleccionado.nombre,
      stock_vendible: 0,
      ultimo_proveedor_id: null,
    });
    toast.success("Producto comercial creado.");
    reset();
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Nuevo producto comercial"
      maxWidth="max-w-lg"
    >
      <ModalForm onSubmit={handleSubmit}>
        <ModalField>
          <ModalLabel>Catálogo</ModalLabel>
          <ModalSelect
            value={catalogoId}
            onChange={(e) => {
              setCatalogoId(e.target.value);
              setGenericoId("");
            }}
          >
            <option value="">Seleccionar…</option>
            {catalogos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </ModalSelect>
        </ModalField>

        <ModalField>
          <ModalLabel>Genérico</ModalLabel>
          <ModalSelect
            value={genericoId}
            onChange={(e) => setGenericoId(e.target.value)}
            disabled={!catalogoId}
          >
            <option value="">Seleccionar…</option>
            {genericos.map((g) => (
              <option key={g.generico_id} value={g.generico_id}>
                {g.generico_nombre}
              </option>
            ))}
          </ModalSelect>
        </ModalField>

        <ModalField>
          <ModalLabel>Laboratorio</ModalLabel>
          <ModalSelect
            value={laboratorioId}
            onChange={(e) => setLaboratorioId(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {laboratorios.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </ModalSelect>
        </ModalField>

        <ModalField>
          <ModalLabel>Nombre comercial</ModalLabel>
          <ModalInput
            value={nombreComercial}
            onChange={(e) => setNombreComercial(e.target.value)}
          />
        </ModalField>

        <ModalField>
          <ModalLabel>Presentación</ModalLabel>
          <ModalInput value={presentacion} onChange={(e) => setPresentacion(e.target.value)} />
        </ModalField>

        <ModalField>
          <ModalLabel>Precio de venta (Q)</ModalLabel>
          <ModalInput
            type="number"
            step="0.01"
            min="0"
            value={precioVenta}
            onChange={(e) => setPrecioVenta(e.target.value)}
          />
        </ModalField>

        <ModalFooter>
          <ModalSubmit disabled={isPending} label="Crear" />
        </ModalFooter>
      </ModalForm>
    </ModalShell>
  );
}
