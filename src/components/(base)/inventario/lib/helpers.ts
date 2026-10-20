import {
  categoriaVencimientoLote,
  diasRestantesVencimientoGt,
} from "@/lib/vencimientos-gt";
import type { ProductoComercial } from "./jerarquia-zod";
import { FORMAS_FARMACEUTICAS, type Producto, type ProductoSugerencia } from "./zod";

export type CamposTituloProducto = {
  nombre: string;
  nombre_comercial?: string | null;
  nombre_generico?: string | null;
  concentracion?: string | null;
  forma_farmaceutica?: string | null;
  presentacion?: string | null;
  requiere_receta?: boolean;
};

export function etiquetaFormaFarmaceutica(forma: string | null | undefined): string {
  const found = FORMAS_FARMACEUTICAS.find((f) => f.value === forma);
  if (found) return found.label;
  const raw = (forma || "").trim();
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function fragmentoYaEnTitulo(titulo: string, fragmento: string): boolean {
  const f = fragmento.trim();
  if (!f) return true;
  const t = normalizarTextoBusquedaProducto(titulo);
  const n = normalizarTextoBusquedaProducto(f);
  return t.includes(n);
}

export function tituloProductoFarmacia(p: CamposTituloProducto): string {
  const nombre = (p.nombre || "").trim();
  const nombreGenerico = (p.nombre_generico || "").trim();
  const conc = (p.concentracion || "").trim();
  const forma = etiquetaFormaFarmaceutica(p.forma_farmaceutica);
  const pres = (p.presentacion || "").trim();

  if (!pres && nombreGenerico && conc) {
    const lineaConConcDuplicada = `${nombreGenerico} ${conc}`.trim();
    const tituloBase = fragmentoYaEnTitulo(nombreGenerico, conc)
      ? nombreGenerico
      : lineaConConcDuplicada;
    const conForma = (base: string) => {
      if (forma && !fragmentoYaEnTitulo(base, forma)) {
        return `${base} · ${forma}`;
      }
      return base;
    };
    if (
      nombre &&
      normalizarTextoBusquedaProducto(nombre) ===
        normalizarTextoBusquedaProducto(lineaConConcDuplicada)
    ) {
      return conForma(tituloBase);
    }
    if (
      nombre &&
      fragmentoYaEnTitulo(nombre, conc) &&
      fragmentoYaEnTitulo(nombre, nombreGenerico)
    ) {
      return conForma(nombre);
    }
    return conForma(tituloBase);
  }

  const generico = nombreGenerico || nombre || "—";
  const tituloBase =
    conc && !fragmentoYaEnTitulo(generico, conc) ? `${generico} ${conc}` : generico;
  const suffix: string[] = [];
  if (forma && !fragmentoYaEnTitulo(tituloBase, forma)) suffix.push(forma);
  if (pres && !fragmentoYaEnTitulo(tituloBase, pres)) suffix.push(pres);
  return suffix.length > 0 ? `${tituloBase} · ${suffix.join(" · ")}` : tituloBase;
}

export function lineaGenericaProductoFarmacia(p: CamposTituloProducto): string {
  return tituloProductoFarmacia({
    ...p,
    nombre: "",
    nombre_comercial: undefined,
  });
}

export function nombreComercialSiDistinto(
  p: CamposTituloProducto & { nombre_comercial?: string | null },
): string | null {
  const marca = (p.nombre_comercial ?? p.nombre ?? "").trim();
  if (!marca) return null;
  const lineaGenerica = lineaGenericaProductoFarmacia(p);
  const normMarca = normalizarTextoBusquedaProducto(marca);
  if (normMarca === normalizarTextoBusquedaProducto(lineaGenerica)) return null;
  if (normMarca === normalizarTextoBusquedaProducto(tituloProductoFarmacia(p))) return null;
  return marca;
}

export type BusquedaInventarioCampo =
  | "todos"
  | "catalogo"
  | "generico"
  | "laboratorio"
  | "comercial";

export function comercialAProductoSugerencia(c: ProductoComercial): ProductoSugerencia {
  return {
    id: c.producto_id,
    nombre: c.nombre_comercial,
    nombre_generico: c.generico_nombre,
    concentracion: c.concentracion,
    forma_farmaceutica: String(c.forma_farmaceutica),
    presentacion: c.presentacion,
    precio_base: c.precio_venta,
    laboratorio_nombre: c.laboratorio_nombre ?? undefined,
    catalogo_nombre: c.catalogo_nombre,
    generico_id: c.generico_id,
    laboratorio_id: c.laboratorio_id,
    catalogo_id: c.catalogo_id,
  };
}

export function comercialAProductoEdicion(c: ProductoComercial): Producto {
  return {
    id: c.producto_id,
    nombre: c.nombre_comercial,
    nombre_generico: c.generico_nombre,
    concentracion: c.concentracion,
    forma_farmaceutica: c.forma_farmaceutica,
    presentacion: c.presentacion,
    unidad_venta: c.unidad_venta,
    requiere_receta: c.requiere_receta,
    descripcion: c.descripcion ?? "",
    precio_base: c.precio_venta,
    stock_actual: c.stock_vendible,
    stock_minimo: c.stock_minimo,
    activo: c.activo,
    imagen_url: c.imagen_url ?? null,
    imagen_url_2: c.imagen_url_2 ?? null,
    imagen_url_3: c.imagen_url_3 ?? null,
    generico_id: c.generico_id,
    laboratorio_id: c.laboratorio_id ?? undefined,
    catalogo_id: c.catalogo_id,
    catalogo_nombre: c.catalogo_nombre,
    laboratorio_nombre: c.laboratorio_nombre ?? undefined,
    laboratorio: etiquetaLaboratorioComercial(c.laboratorio_nombre),
    created_at: c.created_at,
  };
}

function textoIncluyeBusquedaInventario(haystack: string, busqueda: string): boolean {
  const q = normalizarTextoBusquedaProducto(busqueda);
  if (!q) return true;
  return normalizarTextoBusquedaProducto(haystack).includes(q);
}

export function ubicacionesFilaInventario(ubicacion: string | null | undefined): string[] {
  const raw = (ubicacion ?? "").trim();
  if (!raw) return ["Sin asignar"];
  if (!raw.includes(",")) return [raw];
  const partes = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return partes.length > 0 ? partes : ["Sin asignar"];
}

export function filaCoincideUbicacionInventario(
  ubicacion: string | null | undefined,
  filtroUbicacion: string,
): boolean {
  if (!filtroUbicacion) return true;
  return ubicacionesFilaInventario(ubicacion).includes(filtroUbicacion);
}

export function productoCoincideBusquedaInventario(
  p: {
    nombre?: string;
    nombre_generico?: string | null;
    codigo?: string | null;
    laboratorio?: string | null;
  },
  busqueda: string,
  campo: BusquedaInventarioCampo = "todos",
): boolean {
  const q = busqueda.trim();
  if (!q) return true;
  if (campo === "catalogo") {
    const catalogo =
      (p as { catalogo_nombre?: string | null }).catalogo_nombre ||
      (p.nombre_generico || "").split(" ")[0] ||
      "";
    return textoIncluyeBusquedaInventario(catalogo, q) || textoIncluyeBusquedaInventario(p.nombre || "", q);
  }
  if (campo === "generico") {
    return (
      textoIncluyeBusquedaInventario(p.nombre_generico || "", q) ||
      textoIncluyeBusquedaInventario(p.codigo || "", q)
    );
  }
  if (campo === "comercial") {
    return (
      textoIncluyeBusquedaInventario(p.nombre || "", q) ||
      textoIncluyeBusquedaInventario(p.codigo || "", q)
    );
  }
  if (campo === "laboratorio") {
    return textoIncluyeBusquedaInventario(p.laboratorio || "", q);
  }
  return (
    textoIncluyeBusquedaInventario(p.nombre || "", q) ||
    textoIncluyeBusquedaInventario(p.nombre_generico || "", q) ||
    textoIncluyeBusquedaInventario(p.codigo || "", q) ||
    textoIncluyeBusquedaInventario(p.laboratorio || "", q)
  );
}

export function precioVentaEfectivoLote(
  _precioVentaLoteLegacy: number | null | undefined,
  precioBase: number,
): number {
  return Number(precioBase) || 0;
}

type InvGenericoLoteJoin = {
  concentracion?: string | null;
  forma_farmaceutica?: string | null;
  requiere_receta?: boolean | null;
  unidad_venta?: string | null;
  stock_minimo?: number | null;
  inv_catalogos?: { nombre?: string | null } | { nombre?: string | null }[] | null;
};

type InvProductoLoteJoin = {
  id: string;
  nombre: string;
  presentacion?: string | null;
  precio_base?: number | null;
  activo?: boolean | null;
  stock_actual?: number | null;
  inv_laboratorios?: { nombre?: string | null } | { nombre?: string | null }[] | null;
  inv_genericos?: InvGenericoLoteJoin | InvGenericoLoteJoin[] | null;
};

function firstJoin<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function jerarquiaDesdeProductoLote(
  raw: InvProductoLoteJoin | InvProductoLoteJoin[] | null | undefined,
) {
  const p = firstJoin(raw);
  if (!p) {
    return {
      nombre_generico: "",
      concentracion: "",
      forma_farmaceutica: "otro" as const,
      unidad_venta: "unidad",
      requiere_receta: false,
      stock_minimo: 0,
      laboratorio: null as string | null,
      precio_base: 0,
      nombre: "—",
      presentacion: "",
      activo: true,
    };
  }
  const gen = firstJoin(p.inv_genericos);
  const cat = firstJoin(gen?.inv_catalogos);
  const lab = firstJoin(p.inv_laboratorios);
  const catalogoNombre = (cat?.nombre ?? "").trim();
  const concentracion = (gen?.concentracion ?? "").trim();
  const forma = (gen?.forma_farmaceutica ?? "otro").toString();
  const genericoNombre = [catalogoNombre, concentracion, forma]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    nombre_generico: genericoNombre,
    concentracion,
    forma_farmaceutica: forma,
    unidad_venta: (gen?.unidad_venta ?? "unidad").toString(),
    requiere_receta: Boolean(gen?.requiere_receta),
    stock_minimo: Number(gen?.stock_minimo) || 0,
    laboratorio: (lab?.nombre ?? null) as string | null,
    precio_base: Number(p.precio_base) || 0,
    nombre: p.nombre,
    presentacion: (p.presentacion ?? "").toString(),
    activo: Boolean(p.activo ?? true),
    stock_actual: Number(p.stock_actual) || 0,
  };
}

export function laboratorioNombreDesdeLote(lote: {
  inv_productos?: InvProductoLoteJoin | InvProductoLoteJoin[] | null;
}): string | null {
  const p = firstJoin(lote.inv_productos);
  const lab = firstJoin(p?.inv_laboratorios);
  const nombre = (lab?.nombre ?? "").trim();
  return nombre || null;
}

// Fechas de vencimiento
export function inicioDiaLocal(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isProductoProximoAVencer(
  fechaVencimiento?: string | null,
  meses = 4,
): boolean {
  const dias = diasRestantesVencimientoGt(fechaVencimiento);
  if (dias === null) return false;
  if (dias < 0) return false;
  const limiteDias = Math.round(meses * 30.4375);
  return dias <= limiteDias;
}

export function isProductoVencido(fechaVencimiento?: string | null): boolean {
  const dias = diasRestantesVencimientoGt(fechaVencimiento);
  return dias !== null && dias < 0;
}

export function diasRestantesVencimiento(fechaVencimiento?: string | null): number | null {
  return diasRestantesVencimientoGt(fechaVencimiento);
}

export function etiquetaEstadoVencimiento(fechaVencimiento?: string | null): string {
  if (!fechaVencimiento) return "Sin fecha";
  const cat = categoriaVencimientoLote(fechaVencimiento);
  if (cat === "vencido") return "Vencido";
  if (cat === "dias_0_30" || cat === "dias_31_60" || cat === "dias_61_90") return "Por vencer";
  return "Vigente";
}

// Actualizar existencias
export function patchInvLoteCantidadActual(nuevaCantidad: number): {
  cantidad_actual: number;
  activo?: boolean;
} {
  if (nuevaCantidad <= 0) {
    return { cantidad_actual: 0, activo: false };
  }
  return { cantidad_actual: nuevaCantidad, activo: true };
}

export function patchInvProductoStockActual(nuevaCantidad: number): {
  stock_actual: number;
  activo?: boolean;
} {
  const stock_actual = nuevaCantidad <= 0 ? 0 : nuevaCantidad;
  if (stock_actual <= 0) {
    return { stock_actual: 0, activo: false };
  }
  return { stock_actual };
}

export function claveProductoUnico(p: { nombre_generico: string }): string {
  return p.nombre_generico.trim().toLowerCase();
}

export function nombreGenericoListoParaDuplicado(nombreGenerico: string): boolean {
  return nombreGenerico.trim().length >= 2;
}

export const MIN_CARACTERES_BUSQUEDA_PRODUCTO = 3;

export function normalizarTextoBusquedaProducto(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function claveGenericoInventario(concentracion: string, formaFarmaceutica: string): string {
  return `${normalizarTextoBusquedaProducto(concentracion)}|${normalizarTextoBusquedaProducto(formaFarmaceutica)}`;
}

export function buscarGenericoCoincidente<
  T extends { concentracion: string; forma_farmaceutica: string },
>(genericos: T[], concentracion: string, formaFarmaceutica: string): T | null {
  const conc = concentracion.trim();
  if (!conc) return null;
  const clave = claveGenericoInventario(conc, formaFarmaceutica);
  return (
    genericos.find(
      (g) => claveGenericoInventario(g.concentracion, g.forma_farmaceutica) === clave,
    ) ?? null
  );
}

export function elegirGenericoReferenciaCatalogo<
  T extends {
    comerciales: number;
    concentracion: string;
    forma_farmaceutica: string;
    requiere_receta: boolean;
    stock_minimo: number;
  },
>(genericos: T[]): T | null {
  if (genericos.length === 0) return null;
  if (genericos.length === 1) return genericos[0];
  return [...genericos].sort((a, b) => b.comerciales - a.comerciales)[0] ?? null;
}

export function lineaSugerenciaProductoCatalogo(p: CamposTituloProducto): string {
  const generico = (p.nombre_generico || "").trim();
  const conc = (p.concentracion || "").trim();
  const forma = etiquetaFormaFarmaceutica(p.forma_farmaceutica);
  const pres = (p.presentacion || "").trim();
  const titulo = conc ? `${generico} ${conc}` : generico;
  return [titulo, forma, pres].filter(Boolean).join(" · ");
}

export function identificacionProductoCompleta(campos: {
  nombre_generico: string;
  concentracion: string;
  forma_farmaceutica: string;
  presentacion: string;
}): boolean {
  return (
    campos.nombre_generico.trim().length >= 2 &&
    campos.concentracion.trim().length > 0 &&
    campos.forma_farmaceutica.trim().length > 0 &&
    campos.presentacion.trim().length > 0
  );
}

export function productoFarmaciaDesdeLegacy(
  nombre: string,
  descripcion: string,
): {
  nombre_generico: string;
  concentracion: string;
  forma_farmaceutica: "tableta" | "capsula" | "jarabe" | "suspension" | "crema" | "inyectable" | "gotas" | "otro";
  presentacion: string;
} {
  const texto = `${descripcion} ${nombre}`.toLowerCase();
  let forma_farmaceutica:
    | "tableta"
    | "capsula"
    | "jarabe"
    | "suspension"
    | "crema"
    | "inyectable"
    | "gotas"
    | "otro" = "otro";
  if (texto.includes("tableta")) forma_farmaceutica = "tableta";
  else if (texto.includes("cápsula") || texto.includes("capsula") || texto.includes("sobre")) forma_farmaceutica = "capsula";
  else if (texto.includes("suspensi")) forma_farmaceutica = "suspension";
  else if (texto.includes("jarabe") || (texto.includes("frasco") && texto.includes("ml"))) forma_farmaceutica = "jarabe";
  else if (texto.includes("crema") || texto.includes("tubo")) forma_farmaceutica = "crema";
  else if (texto.includes("ampolla") || texto.includes("inyect") || texto.includes("insulina")) forma_farmaceutica = "inyectable";
  else if (texto.includes("gota")) forma_farmaceutica = "gotas";

  const match = nombre.trim().match(/^(.+?)\s+(\d[\d./\s%a-zA-Zµµ]*)$/);
  const nombre_generico = match ? match[1].trim() : nombre.trim();
  const concentracion = match ? match[2].trim() : "Estándar";
  const presentacion = descripcion.trim() || nombre.trim();

  return { nombre_generico, concentracion, forma_farmaceutica, presentacion };
}

export const FILTRO_LABORATORIO_SIN_ASIGNAR = "00000000-0000-0000-0000-000000000000";

export const ETIQUETA_LABORATORIO_SIN_ASIGNAR = "Sin asignar";

export function etiquetaLaboratorioComercial(nombre: string | null | undefined): string {
  const t = (nombre ?? "").trim();
  return t.length > 0 ? t : ETIQUETA_LABORATORIO_SIN_ASIGNAR;
}

export function esLaboratorioPlaceholder(nombre: string): boolean {
  return normalizarTextoBusquedaProducto(nombre) === "sin laboratorio";
}

export function inventarioAlertaStockBajo(fila: {
  stock_actual: number;
  stock_minimo: number;
  bajo_minimo?: boolean;
}): boolean {
  if (fila.stock_minimo <= 0) return false;
  if (fila.bajo_minimo !== undefined) return fila.bajo_minimo;
  return fila.stock_actual <= fila.stock_minimo;
}

export function laboratoriosParaSeleccionComercial<
  T extends { id: string; nombre: string; proveedor_nombre?: string | null },
>(laboratorios: T[]): T[] {
  return laboratorios.filter((l) => !esLaboratorioPlaceholder(l.nombre));
}

export function ordenarLaboratoriosProveedorPrimero<
  T extends { id: string; proveedor_id?: string | null },
>(laboratorios: T[], proveedorId: string | null | undefined): T[] {
  if (!proveedorId) return [...laboratorios];
  const delProveedor: T[] = [];
  const otros: T[] = [];
  for (const lab of laboratorios) {
    if (lab.proveedor_id === proveedorId) delProveedor.push(lab);
    else otros.push(lab);
  }
  return [...delProveedor, ...otros];
}
