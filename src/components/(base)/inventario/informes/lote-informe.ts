import { normalizarFechaCalendario } from "@/lib/fechas-gt";
import {
  etiquetaLaboratorioComercial,
  jerarquiaDesdeProductoLote,
  precioVentaEfectivoLote,
} from "../lib/helpers";
import type { InvGenerico } from "../lib/jerarquia-zod";
import type { LoteInventario } from "../lib/zod";

export type FilaLoteInforme = {
  lote_id: string;
  producto_id: string;
  generico_id: string;
  catalogo_nombre: string;
  concentracion: string;
  forma_farmaceutica: string;
  generico_nombre: string;
  marca: string;
  presentacion: string;
  laboratorio: string;
  numero_lote: string;
  codigo_barras: string;
  ubicacion: string;
  fecha_vencimiento: string;
  existencia: number;
  precio_costo: number;
  precio_venta: number;
  valor_costo: number;
  valor_venta: number;
  proveedor_nombre: string;
  activo: boolean;
  compra_registro_at: string;
};

export type FilaStockBajoInforme = {
  generico_id: string;
  producto: string;
  concentracion_forma: string;
  minimo: number;
  existencia: number;
  faltante: number;
  sugerido: number;
  ultima_marca: string;
  ultimo_proveedor: string;
  ultimo_costo: number;
  agotado: boolean;
};

type LoteRaw = {
  id: string;
  producto_id: string;
  codigo_barras: string;
  numero_lote: string;
  cantidad_actual: number;
  precio_costo: number;
  fecha_vencimiento: string;
  ubicacion?: string | null;
  activo: boolean;
  proveedor_id?: string | null;
  inv_proveedores?: { nombre: string } | null;
  inv_compras_detalles?: {
    inv_compras?: { created_at?: string | null } | null;
  } | null;
  inv_productos?: LoteInventario["inv_productos"];
};

function compraRegistroDesdeLote(raw: LoteRaw): string {
  const compra = raw.inv_compras_detalles?.inv_compras?.created_at;
  return compra ? String(compra) : "";
}

export function mapLoteRawAFilaInforme(raw: LoteRaw): FilaLoteInforme | null {
  const jer = jerarquiaDesdeProductoLote(raw.inv_productos);
  const prodJoin = Array.isArray(raw.inv_productos)
    ? raw.inv_productos[0]
    : raw.inv_productos;
  const genericoJoin = prodJoin?.inv_genericos;
  const gen = Array.isArray(genericoJoin) ? genericoJoin[0] : genericoJoin;
  const genericoId =
    (prodJoin as { generico_id?: string } | undefined)?.generico_id ??
    (gen as { id?: string } | undefined)?.id ??
    "";
  const cat = gen?.inv_catalogos;
  const catalogo = Array.isArray(cat) ? cat[0] : cat;
  const catalogoNombre = (catalogo?.nombre ?? "").trim();
  const existencia = Number(raw.cantidad_actual) || 0;
  const costo = Number(raw.precio_costo) || 0;
  const precioVenta = precioVentaEfectivoLote(undefined, jer.precio_base);

  if (!genericoId && !catalogoNombre) return null;

  return {
    lote_id: raw.id,
    producto_id: raw.producto_id,
    generico_id: genericoId || raw.producto_id,
    catalogo_nombre: catalogoNombre || jer.nombre_generico,
    concentracion: jer.concentracion,
    forma_farmaceutica: jer.forma_farmaceutica,
    generico_nombre: jer.nombre_generico,
    marca: jer.nombre,
    presentacion: jer.presentacion,
    laboratorio: etiquetaLaboratorioComercial(jer.laboratorio),
    numero_lote: raw.numero_lote ?? "",
    codigo_barras: raw.codigo_barras ?? "",
    ubicacion: (raw.ubicacion ?? "").trim() || "Sin asignar",
    fecha_vencimiento: normalizarFechaCalendario(raw.fecha_vencimiento),
    existencia,
    precio_costo: costo,
    precio_venta: precioVenta,
    valor_costo: existencia * costo,
    valor_venta: existencia * precioVenta,
    proveedor_nombre: raw.inv_proveedores?.nombre?.trim() ?? "",
    activo: Boolean(raw.activo),
    compra_registro_at: compraRegistroDesdeLote(raw),
  };
}

export function mapLoteInventarioAFilaInforme(lote: LoteInventario): FilaLoteInforme {
  const mapped = mapLoteRawAFilaInforme({
    id: lote.id,
    producto_id: lote.producto_id,
    codigo_barras: lote.codigo_barras,
    numero_lote: lote.numero_lote,
    cantidad_actual: lote.cantidad_actual,
    precio_costo: lote.precio_costo,
    fecha_vencimiento: lote.fecha_vencimiento,
    ubicacion: lote.ubicacion,
    activo: lote.activo,
    inv_proveedores: lote.inv_proveedores,
    inv_productos: lote.inv_productos,
  });
  if (mapped) return mapped;
  return {
    lote_id: lote.id,
    producto_id: lote.producto_id,
    generico_id: lote.producto_id,
    catalogo_nombre: "",
    concentracion: "",
    forma_farmaceutica: "",
    generico_nombre: "",
    marca: "—",
    presentacion: "",
    laboratorio: "Sin asignar",
    numero_lote: lote.numero_lote ?? "",
    codigo_barras: lote.codigo_barras ?? "",
    ubicacion: "Sin asignar",
    fecha_vencimiento: normalizarFechaCalendario(lote.fecha_vencimiento),
    existencia: Number(lote.cantidad_actual) || 0,
    precio_costo: Number(lote.precio_costo) || 0,
    precio_venta: 0,
    valor_costo: 0,
    valor_venta: 0,
    proveedor_nombre: "",
    activo: lote.activo,
    compra_registro_at: "",
  };
}

export function lotesActivosConExistencia(filas: FilaLoteInforme[]): FilaLoteInforme[] {
  return filas.filter((f) => f.activo && f.existencia > 0);
}

export function claveGenericoInforme(f: FilaLoteInforme): string {
  return f.generico_id;
}

export function etiquetaConcentracionForma(f: FilaLoteInforme): string {
  const partes = [f.concentracion, f.forma_farmaceutica].filter(Boolean);
  return partes.join(" · ") || "—";
}

export function compararFilasLoteInforme(a: FilaLoteInforme, b: FilaLoteInforme): number {
  const cmpCat = a.catalogo_nombre.localeCompare(b.catalogo_nombre, "es", {
    sensitivity: "base",
  });
  if (cmpCat !== 0) return cmpCat;
  const cmpConc = a.concentracion.localeCompare(b.concentracion, "es", {
    sensitivity: "base",
  });
  if (cmpConc !== 0) return cmpConc;
  const cmpForma = a.forma_farmaceutica.localeCompare(b.forma_farmaceutica, "es", {
    sensitivity: "base",
  });
  if (cmpForma !== 0) return cmpForma;
  const cmpMarca = a.marca.localeCompare(b.marca, "es", { sensitivity: "base" });
  if (cmpMarca !== 0) return cmpMarca;
  return a.numero_lote.localeCompare(b.numero_lote, "es", { sensitivity: "base" });
}

export function compararFilasConteoFisico(a: FilaLoteInforme, b: FilaLoteInforme): number {
  const cmpUbi = a.ubicacion.localeCompare(b.ubicacion, "es", { sensitivity: "base" });
  if (cmpUbi !== 0) return cmpUbi;
  const cmpProd = a.generico_nombre.localeCompare(b.generico_nombre, "es", {
    sensitivity: "base",
  });
  if (cmpProd !== 0) return cmpProd;
  return compararFilasLoteInforme(a, b);
}

export function ultimoLotePorGenerico(
  lotes: FilaLoteInforme[],
): Map<string, FilaLoteInforme> {
  const map = new Map<string, FilaLoteInforme>();
  for (const lote of lotes) {
    const key = lote.generico_id;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, lote);
      continue;
    }
    const tsNuevo = lote.compra_registro_at;
    const tsPrev = prev.compra_registro_at;
    if (tsNuevo > tsPrev) {
      map.set(key, lote);
    } else if (tsNuevo === tsPrev && lote.lote_id.localeCompare(prev.lote_id) > 0) {
      map.set(key, lote);
    }
  }
  return map;
}

export function genericosBajoMinimoInforme(genericos: InvGenerico[]): InvGenerico[] {
  return genericos.filter(
    (g) => g.stock_minimo > 0 && g.stock_vendible < g.stock_minimo,
  );
}

export function construirFilasStockBajo(
  genericos: InvGenerico[],
  lotes: FilaLoteInforme[],
): FilaStockBajoInforme[] {
  const bajo = genericosBajoMinimoInforme(genericos);
  const ultimos = ultimoLotePorGenerico(lotes);
  return bajo
    .map((g) => {
      const existencia = g.stock_vendible;
      const minimo = g.stock_minimo;
      const faltante = Math.max(0, minimo - existencia);
      const sugerido = Math.max(0, Math.round(2 * minimo - existencia));
      const ult = ultimos.get(g.generico_id);
      return {
        generico_id: g.generico_id,
        producto: g.catalogo_nombre,
        concentracion_forma: [g.concentracion, g.forma_farmaceutica]
          .filter(Boolean)
          .join(" · "),
        minimo,
        existencia,
        faltante,
        sugerido,
        ultima_marca: ult?.marca ?? "—",
        ultimo_proveedor: ult?.proveedor_nombre?.trim() || "—",
        ultimo_costo: ult?.precio_costo ?? 0,
        agotado: existencia <= 0,
      };
    })
    .sort((a, b) => {
      const prov = a.ultimo_proveedor.localeCompare(b.ultimo_proveedor, "es", {
        sensitivity: "base",
      });
      if (prov !== 0) return prov;
      return a.producto.localeCompare(b.producto, "es", { sensitivity: "base" });
    });
}

export const LOTES_INFORME_SELECT =
  "id, producto_id, compra_detalle_id, codigo_barras, numero_lote, cantidad_inicial, cantidad_actual, precio_costo, fecha_vencimiento, ubicacion, activo, proveedor_id, inv_proveedores(nombre), inv_compras_detalles(inv_compras(created_at)), inv_productos(id, nombre, presentacion, precio_base, stock_actual, activo, generico_id, inv_laboratorios(nombre), inv_genericos(id, concentracion, forma_farmaceutica, requiere_receta, unidad_venta, stock_minimo, inv_catalogos(nombre)))";
