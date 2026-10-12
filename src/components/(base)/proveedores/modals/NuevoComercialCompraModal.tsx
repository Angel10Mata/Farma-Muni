"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
  laboratoriosParaSeleccionComercial,
  ordenarLaboratoriosProveedorPrimero,
} from "@/components/(base)/inventario/lib/helpers";
import {
  useCatalogosInventario,
  useGenericosInventario,
  useGuardarComercialInventario,
  useLaboratoriosInventario,
} from "@/components/(base)/inventario/lib/hooks";
import type { ComercialCompra, Proveedor } from "../lib/zod";

interface NuevoComercialCompraModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (comercial: ComercialCompra) => void;
  proveedorCompra?: Proveedor | null;
}

export function NuevoComercialCompraModal({
  open,
  onClose,
  onCreated,
  proveedorCompra,
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

  const laboratoriosOrdenados = useMemo(() => {
    const base = laboratoriosParaSeleccionComercial(laboratorios);
    return ordenarLaboratoriosProveedorPrimero(base, proveedorCompra?.id);
  }, [laboratorios, proveedorCompra?.id]);

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
    if (!genericoId) {
      toast.warn("Selecciona un genérico.");
      return;
    }
    if (!laboratorioId) {
      toast.warn("Selecciona un laboratorio. Si falta uno, créalo en el detalle del proveedor.");
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
      const er = err as Error & { message?: string; detail?: string };
      toast.error(modalActionMessage(er.message ?? "ERROR", er.detail ?? "No se pudo crear el comercial."));
      return;
    }

    const id = res.id;
    const labNombre = laboratorioSeleccionado?.nombre ?? "";
    if (!id || !genericoSeleccionado || !catalogoSeleccionado) {
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
      laboratorio_id: laboratorioId,
      laboratorio_nombre: labNombre,
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
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            Crea laboratorios en{" "}
            <Link
              href="/farmamuni/proveedores"
              className="font-bold text-[#2c5f9b] underline dark:text-[#6f9fd4]"
            >
              Proveedores
            </Link>
            {proveedorCompra ? ` (detalle de ${proveedorCompra.nombre})` : ""}.
          </p>
          <ModalSelect
            value={laboratorioId}
            onChange={(e) => setLaboratorioId(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {laboratoriosOrdenados.map((l) => (
              <option key={l.id} value={l.id}>
                {l.proveedor_id === proveedorCompra?.id ? "★ " : ""}
                {l.nombre}
                {l.proveedor_nombre ? ` · ${l.proveedor_nombre}` : ""}
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
