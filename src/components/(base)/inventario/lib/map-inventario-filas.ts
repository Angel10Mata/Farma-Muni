import type { InvCatalogoResumen, InvGenerico, ProductoComercial } from "./jerarquia-zod";
import type { LoteInventario } from "./zod";
import {
  ETIQUETA_LABORATORIO_SIN_ASIGNAR,
  FILTRO_LABORATORIO_SIN_ASIGNAR,
  etiquetaLaboratorioComercial,
  jerarquiaDesdeProductoLote,
  precioVentaEfectivoLote,
} from "./helpers";

export type FilaInventarioUi = {
  id: string;
  producto_maestro_id?: string;
  codigo: string;
  nombre: string;
  nombre_generico?: string;
  catalogo_nombre?: string;
  concentracion?: string;
  forma_farmaceutica?: string;
  presentacion?: string;
  unidad_venta?: string;
  requiere_receta?: boolean;
  descripcion: string;
  precio_base: number;
  precio_venta?: number;
  precio_costo?: number | null;
  laboratorio?: string | null;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  imagen_url?: string | null;
  fecha_vencimiento?: string | null;
  numero_lote?: string | null;
  ubicacion?: string | null;
  genericos_count?: number;
  comerciales_count?: number;
  bajo_minimo?: boolean;
  catalogo_id?: string;
  generico_id?: string;
  laboratorio_id?: string;
  laboratorio_proveedor_nombre?: string | null;
  inv_proveedores?: { nombre: string } | null;
};

export function filasDesdeCatalogos(items: InvCatalogoResumen[]): FilaInventarioUi[] {
  return items.map((c) => ({
    id: c.id,
    catalogo_id: c.id,
    codigo: "",
    nombre: c.nombre,
    nombre_generico: c.nombre,
    catalogo_nombre: c.nombre,
    descripcion: c.descripcion ?? "",
    precio_base: 0,
    stock_actual: c.stock_vendible,
    stock_minimo: 0,
    activo: c.activo,
    genericos_count: c.genericos,
  }));
}

export function filasDesdeGenericos(items: InvGenerico[]): FilaInventarioUi[] {
  return items.map((g) => ({
    id: g.generico_id,
    generico_id: g.generico_id,
    catalogo_id: g.catalogo_id,
    catalogo_nombre: g.catalogo_nombre,
    codigo: "",
    nombre: [g.catalogo_nombre, g.concentracion].filter(Boolean).join(" "),
    nombre_generico: g.catalogo_nombre,
    concentracion: g.concentracion,
    forma_farmaceutica: g.forma_farmaceutica,
    descripcion: "",
    precio_base: g.precio_desde ?? 0,
    stock_actual: g.stock_vendible,
    stock_minimo: g.stock_minimo,
    activo: g.activo,
    requiere_receta: g.requiere_receta,
    bajo_minimo: g.bajo_minimo,
    comerciales_count: g.comerciales,
  }));
}

export function filasDesdeComerciales(items: ProductoComercial[]): FilaInventarioUi[] {
  return items.map((c) => ({
    id: c.producto_id,
    producto_maestro_id: c.producto_id,
    catalogo_id: c.catalogo_id,
    generico_id: c.generico_id,
    laboratorio_id: c.laboratorio_id ?? undefined,
    codigo: "",
    nombre: c.nombre_comercial,
    nombre_generico: c.generico_nombre,
    catalogo_nombre: c.catalogo_nombre,
    concentracion: c.concentracion,
    forma_farmaceutica: c.forma_farmaceutica,
    presentacion: c.presentacion,
    unidad_venta: c.unidad_venta,
    requiere_receta: c.requiere_receta,
    descripcion: c.descripcion ?? "",
    precio_base: c.precio_venta,
    precio_venta: c.precio_venta,
    laboratorio: etiquetaLaboratorioComercial(c.laboratorio_nombre),
    stock_actual: c.stock_vendible,
    stock_minimo: c.stock_minimo,
    activo: c.activo,
    imagen_url: c.imagen_url ?? null,
    fecha_vencimiento: c.proximo_vencimiento,
    bajo_minimo: c.stock_minimo > 0 && c.stock_vendible <= c.stock_minimo,
  }));
}

export function esFilaAgregadaLaboratorio(row: FilaInventarioUi): boolean {
  return Boolean(
    (row.comerciales_count ?? 0) > 0 &&
      (row.id === row.laboratorio_id || row.id === FILTRO_LABORATORIO_SIN_ASIGNAR),
  );
}

export function esFilaAgregadaCatalogo(row: FilaInventarioUi): boolean {
  return Boolean(row.catalogo_id && row.id === row.catalogo_id && !row.generico_id);
}

export function esFilaAgregadaGenerico(row: FilaInventarioUi): boolean {
  return Boolean(row.generico_id && row.id === row.generico_id && !row.producto_maestro_id);
}

/** UUID de `inv_productos` / `v_inv_comerciales.producto_id` para editar o listar lotes. */
export function idProductoComercialParaEdicion(row: {
  id: string;
  producto_maestro_id?: string;
  catalogo_id?: string;
  generico_id?: string;
  laboratorio_id?: string;
  comerciales_count?: number;
  numero_lote?: string | null;
}): string | null {
  if (row.producto_maestro_id) return row.producto_maestro_id;
  if (row.catalogo_id && row.id === row.catalogo_id) return null;
  if (row.generico_id && row.id === row.generico_id) return null;
  if (
    (row.id === row.laboratorio_id || row.id === FILTRO_LABORATORIO_SIN_ASIGNAR) &&
    (row.comerciales_count ?? 0) > 0
  ) {
    return null;
  }
  if (row.numero_lote != null) return null;
  return row.id;
}

export function filasDesdeLaboratorio(comerciales: ProductoComercial[]): FilaInventarioUi[] {
  const porLab = new Map<string, ProductoComercial[]>();
  for (const c of comerciales) {
    const key = c.laboratorio_id ?? FILTRO_LABORATORIO_SIN_ASIGNAR;
    const list = porLab.get(key) ?? [];
    list.push(c);
    porLab.set(key, list);
  }

  const filas: FilaInventarioUi[] = [];
  for (const [labKey, list] of porLab) {
    const first = list[0];
    const stock = list.reduce((s, x) => s + x.stock_vendible, 0);
    const sinAsignar = labKey === FILTRO_LABORATORIO_SIN_ASIGNAR;
    const labNombre = sinAsignar
      ? ETIQUETA_LABORATORIO_SIN_ASIGNAR
      : etiquetaLaboratorioComercial(first.laboratorio_nombre);
    filas.push({
      id: sinAsignar ? FILTRO_LABORATORIO_SIN_ASIGNAR : first.laboratorio_id!,
      laboratorio_id: sinAsignar ? undefined : first.laboratorio_id ?? undefined,
      catalogo_id: first.catalogo_id,
      generico_id: first.generico_id,
      codigo: "",
      nombre: labNombre,
      nombre_generico: labNombre,
      laboratorio: labNombre,
      descripcion: list.map((x) => x.nombre_comercial).join(" · "),
      precio_base: 0,
      stock_actual: stock,
      stock_minimo: 0,
      activo: list.some((x) => x.activo),
      comerciales_count: list.length,
    });
  }
  return filas.sort((a, b) => (a.laboratorio || "").localeCompare(b.laboratorio || "", "es"));
}

export function mapLoteAFilaInventario(lote: LoteInventario): FilaInventarioUi {
  const jer = jerarquiaDesdeProductoLote(lote.inv_productos);
  const precioVenta = precioVentaEfectivoLote(undefined, jer.precio_base);
  return {
    id: lote.id,
    producto_maestro_id: lote.producto_id,
    codigo: lote.codigo_barras,
    nombre: jer.nombre,
    nombre_generico: jer.nombre_generico,
    concentracion: jer.concentracion,
    forma_farmaceutica: jer.forma_farmaceutica,
    presentacion: jer.presentacion,
    unidad_venta: jer.unidad_venta,
    requiere_receta: jer.requiere_receta,
    descripcion: "",
    precio_base: jer.precio_base,
    precio_venta: precioVenta,
    precio_costo: lote.precio_costo,
    laboratorio: etiquetaLaboratorioComercial(jer.laboratorio),
    stock_actual: Number(lote.cantidad_actual) || 0,
    stock_minimo: jer.stock_minimo,
    activo: lote.activo && jer.activo,
    fecha_vencimiento: lote.fecha_vencimiento ?? null,
    numero_lote: lote.numero_lote ?? null,
    ubicacion: lote.ubicacion ?? null,
    inv_proveedores: lote.inv_proveedores ?? null,
  };
}
