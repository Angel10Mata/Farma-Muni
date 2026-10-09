import {
  categoriaVencimientoLote,
  diasRestantesVencimientoGt,
} from "@/lib/vencimientos-gt";
import { FORMAS_FARMACEUTICAS } from "./zod";

export type CamposTituloProducto = {
  nombre: string;
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

export function tituloProductoFarmacia(p: CamposTituloProducto): string {
  const generico = (p.nombre_generico || p.nombre || "—").trim();
  const conc = (p.concentracion || "").trim();
  const forma = etiquetaFormaFarmaceutica(p.forma_farmaceutica);
  const pres = (p.presentacion || "").trim();
  const tituloBase = conc ? `${generico} ${conc}` : generico;
  const suffix: string[] = [];
  if (forma) suffix.push(forma);
  if (pres) suffix.push(pres);
  return suffix.length > 0 ? `${tituloBase} · ${suffix.join(" · ")}` : tituloBase;
}

export function nombreComercialSiDistinto(p: CamposTituloProducto): string | null {
  const comercial = (p.nombre || "").trim();
  const generico = (p.nombre_generico || "").trim().toLowerCase();
  if (!comercial) return null;
  if (!generico || comercial.toLowerCase() === generico) return null;
  return comercial;
}

export function productoCoincideBusquedaInventario(
  p: { nombre?: string; nombre_generico?: string | null; codigo?: string | null },
  busqueda: string,
): boolean {
  const q = busqueda.trim().toLowerCase();
  if (!q) return true;
  return (
    (p.nombre || "").toLowerCase().includes(q) ||
    (p.nombre_generico || "").toLowerCase().includes(q) ||
    (p.codigo || "").toLowerCase().includes(q)
  );
}

export function precioVentaEfectivoLote(
  precioVenta: number | null | undefined,
  precioBase: number,
): number {
  if (precioVenta != null && !Number.isNaN(Number(precioVenta))) {
    return Number(precioVenta);
  }
  return precioBase;
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

// Clave única de producto (nombre genérico + presentación)
export function claveProductoUnico(p: {
  nombre_generico: string;
  concentracion: string;
  forma_farmaceutica: string;
  presentacion: string;
}): string {
  const n = (s: string) => s.trim().toLowerCase();
  return [n(p.nombre_generico), n(p.concentracion), n(p.forma_farmaceutica), n(p.presentacion)].join("\0");
}

export const MIN_CARACTERES_BUSQUEDA_PRODUCTO = 3;

export function normalizarTextoBusquedaProducto(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
