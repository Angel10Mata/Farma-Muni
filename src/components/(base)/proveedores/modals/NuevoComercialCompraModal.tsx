"use client";

import { useEffect, useMemo, useState } from "react";
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
  normalizarTextoBusquedaProducto,
  ordenarLaboratoriosProveedorPrimero,
} from "@/components/(base)/inventario/lib/helpers";
import { lineaGenericaCompraDisplay } from "../lib/compras-helpers";
import { DUPLICATE_COMERCIAL_MSG } from "@/components/(base)/inventario/lib/jerarquia-zod";
import {
  useCatalogosInventario,
  useGenericosInventario,
  useGuardarComercialInventario,
  useLaboratoriosInventario,
} from "@/components/(base)/inventario/lib/hooks";
import { CrearLaboratorio } from "@/components/(base)/inventario/forms/CrearLaboratorio";
import type { NuevoComercialCompraPreset } from "../ComprasContext";
import type { ComercialCompra, Proveedor } from "../lib/zod";

interface NuevoComercialCompraModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (comercial: ComercialCompra) => void;
  proveedorCompra?: Proveedor | null;
  preset?: NuevoComercialCompraPreset | null;
  comercialesCatalogo?: ComercialCompra[];
}

function comercialMismaClaveUnica(
  c: ComercialCompra,
  genericoId: string,
  laboratorioId: string | null,
  nombreComercial: string,
  presentacion: string,
): boolean {
  return (
    c.generico_id === genericoId &&
    (c.laboratorio_id ?? null) === laboratorioId &&
    normalizarTextoBusquedaProducto(c.nombre_comercial) ===
      normalizarTextoBusquedaProducto(nombreComercial) &&
    normalizarTextoBusquedaProducto(c.presentacion) ===
      normalizarTextoBusquedaProducto(presentacion)
  );
}

export function NuevoComercialCompraModal({
  open,
  onClose,
  onCreated,
  proveedorCompra,
  preset = null,
  comercialesCatalogo = [],
}: NuevoComercialCompraModalProps) {
  const modoGenericoFijo = preset != null;

  const [catalogoId, setCatalogoId] = useState("");
  const [genericoId, setGenericoId] = useState("");
  const [laboratorioId, setLaboratorioId] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [modalLabOpen, setModalLabOpen] = useState(false);

  const { data: catalogos = [] } = useCatalogosInventario();
  const { data: genericos = [] } = useGenericosInventario(
    !modoGenericoFijo && catalogoId ? { catalogo_id: catalogoId } : undefined,
  );
  const { data: laboratorios = [] } = useLaboratoriosInventario();
  const { mutateAsync: guardarComercial, isPending } = useGuardarComercialInventario();

  const laboratoriosOrdenados = useMemo(() => {
    const base = laboratoriosParaSeleccionComercial(laboratorios);
    return ordenarLaboratoriosProveedorPrimero(base, proveedorCompra?.id);
  }, [laboratorios, proveedorCompra?.id]);

  const genericoSeleccionado = useMemo(() => {
    if (preset) {
      return {
        generico_id: preset.generico_id,
        generico_nombre: preset.generico_nombre,
        concentracion: preset.concentracion,
        forma_farmaceutica: preset.forma_farmaceutica,
      };
    }
    return genericos.find((g) => g.generico_id === genericoId);
  }, [genericos, genericoId, preset]);

  const catalogoSeleccionado = useMemo(() => {
    if (preset) {
      return { id: preset.catalogo_id, nombre: preset.catalogo_nombre };
    }
    return catalogos.find((c) => c.id === catalogoId);
  }, [catalogos, catalogoId, preset]);

  const laboratorioSeleccionado = useMemo(
    () => laboratorios.find((l) => l.id === laboratorioId),
    [laboratorios, laboratorioId],
  );

  useEffect(() => {
    if (!open) return;
    if (preset) {
      setCatalogoId(preset.catalogo_id);
      setGenericoId(preset.generico_id);
      setLaboratorioId("");
      setNombreComercial(preset.nombreComercialInicial);
      setPresentacion(preset.presentacionInicial);
      setPrecioVenta(String(preset.precioVentaInicial));
      return;
    }
    setCatalogoId("");
    setGenericoId("");
    setLaboratorioId("");
    setNombreComercial("");
    setPresentacion("");
    setPrecioVenta("");
  }, [open, preset]);

  const reset = () => {
    if (preset) {
      setCatalogoId(preset.catalogo_id);
      setGenericoId(preset.generico_id);
      setLaboratorioId("");
      setNombreComercial(preset.nombreComercialInicial);
      setPresentacion(preset.presentacionInicial);
      setPrecioVenta(String(preset.precioVentaInicial));
      return;
    }
    setCatalogoId("");
    setGenericoId("");
    setLaboratorioId("");
    setNombreComercial("");
    setPresentacion("");
    setPrecioVenta("");
  };

  const buscarComercialExistente = (
    gid: string,
    labId: string | null,
    nombre: string,
    pres: string,
  ): ComercialCompra | undefined =>
    comercialesCatalogo.find((c) =>
      comercialMismaClaveUnica(c, gid, labId, nombre, pres),
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const precio = Number(precioVenta);
    const gid = modoGenericoFijo ? preset!.generico_id : genericoId;
    if (!gid) {
      toast.warn("Selecciona un genérico.");
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

    const labId = laboratorioId ? laboratorioId : null;
    const nombreTrim = nombreComercial.trim();
    const presTrim = presentacion.trim();

    const yaEnCatalogo = buscarComercialExistente(gid, labId, nombreTrim, presTrim);
    if (yaEnCatalogo) {
      toast.warn(DUPLICATE_COMERCIAL_MSG);
      onCreated(yaEnCatalogo);
      reset();
      onClose();
      return;
    }

    let res: { success: true; id: string };
    try {
      res = await guardarComercial({
        data: {
          generico_id: gid,
          laboratorio_id: labId,
          nombre_comercial: nombreTrim,
          presentacion: presTrim,
          precio_venta: precio,
          activo: true,
        },
      });
    } catch (err) {
      const er = err as Error & { message?: string; detail?: string };
      if (er.message === "DUPLICATE") {
        const existente = buscarComercialExistente(gid, labId, nombreTrim, presTrim);
        if (existente) {
          toast.warn(er.detail ?? DUPLICATE_COMERCIAL_MSG);
          onCreated(existente);
          reset();
          onClose();
          return;
        }
      }
      toast.error(modalActionMessage(er.message ?? "ERROR", er.detail ?? "No se pudo crear el comercial."));
      return;
    }

    const id = res.id;
    const labNombre = laboratorioId ? (laboratorioSeleccionado?.nombre ?? null) : null;
    if (!id || !genericoSeleccionado || !catalogoSeleccionado) {
      toast.success("Producto comercial creado.");
      reset();
      onClose();
      return;
    }

    onCreated({
      id,
      nombre_comercial: nombreTrim,
      presentacion: presTrim,
      precio_venta: precio,
      activo: true,
      catalogo_id: catalogoSeleccionado.id,
      catalogo_nombre: catalogoSeleccionado.nombre,
      generico_id: genericoSeleccionado.generico_id,
      generico_nombre: genericoSeleccionado.generico_nombre,
      concentracion: genericoSeleccionado.concentracion,
      forma_farmaceutica: String(genericoSeleccionado.forma_farmaceutica),
      laboratorio_id: laboratorioId || null,
      laboratorio_nombre: labNombre,
      stock_vendible: 0,
      ultimo_proveedor_id: proveedorCompra?.id ?? null,
    });
    toast.success("Producto comercial creado.");
    reset();
    onClose();
  };

  const etiquetaGenericoFijo = preset ? lineaGenericaCompraDisplay(preset) : "";

  return (
    <>
      <ModalShell
        open={open && !modalLabOpen}
        onClose={() => {
          reset();
          onClose();
        }}
        title={modoGenericoFijo ? "Otra casa comercial" : "Nuevo producto comercial"}
        maxWidth="max-w-lg"
      >
        <ModalForm onSubmit={handleSubmit}>
          {modoGenericoFijo ? (
            <ModalField>
              <ModalLabel>Genérico</ModalLabel>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{etiquetaGenericoFijo}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Catálogo: {preset!.catalogo_nombre}
              </p>
            </ModalField>
          ) : (
            <>
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
            </>
          )}

          <ModalField>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ModalLabel>Laboratorio</ModalLabel>
              <button
                type="button"
                className="text-xs font-bold text-[#2c5f9b] underline dark:text-[#6f9fd4]"
                onClick={() => setModalLabOpen(true)}
              >
                Crear laboratorio
              </button>
            </div>
            {!modoGenericoFijo ? (
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
            ) : null}
            <ModalSelect
              value={laboratorioId}
              onChange={(e) => setLaboratorioId(e.target.value)}
            >
              <option value="">Sin asignar</option>
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
            <ModalSubmit disabled={isPending} label={modoGenericoFijo ? "Crear marca" : "Crear"} />
          </ModalFooter>
        </ModalForm>
      </ModalShell>
      {modalLabOpen ? (
        <CrearLaboratorio
          isOpen
          proveedorIdPreseleccionado={proveedorCompra?.id ?? null}
          onClose={() => setModalLabOpen(false)}
          onSuccess={() => setModalLabOpen(false)}
        />
      ) : null}
    </>
  );
}
