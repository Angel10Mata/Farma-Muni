import { construirMetaInforme } from "@/lib/reportes/meta-informe";
import {
  resolverGenericosInforme,
  resolverKardexInforme,
  resolverLotesInforme,
} from "./cargar-datos";
import { descargarExistenciasValorizadasExcel, descargarExistenciasValorizadasPdf } from "./existencias-valorizadas";
import { descargarHojaConteoFisicoPdf } from "./hoja-conteo";
import { descargarKardexExcel, descargarKardexPdf } from "./kardex-excel";
import { descargarStockBajoExcel, descargarStockBajoPdf } from "./stock-bajo";
import { descargarVencimientosExcel, descargarVencimientosPdf } from "./vencimientos";

export type ResultadoInforme =
  | { ok: true; mensaje?: string }
  | { ok: false; mensaje: string };

async function cargarLotesYGenericos(isDemoMode: boolean) {
  const lotesRes = await resolverLotesInforme(isDemoMode);
  if (!Array.isArray(lotesRes)) {
    return { error: lotesRes.error ?? "ERROR" } as const;
  }
  const genericosRes = await resolverGenericosInforme(isDemoMode);
  if (!Array.isArray(genericosRes)) {
    return { error: genericosRes.error ?? "ERROR" } as const;
  }
  return { lotes: lotesRes, genericos: genericosRes };
}

function mensajeErrorCodigo(code: string): string {
  if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
    return "No tiene permiso para generar este informe.";
  }
  return "No se pudieron cargar los datos del informe.";
}

export async function ejecutarExistenciasValorizadasPdf(
  isDemoMode: boolean,
  generadoPor: string,
): Promise<ResultadoInforme> {
  const data = await cargarLotesYGenericos(isDemoMode);
  if ("error" in data) {
    return { ok: false, mensaje: mensajeErrorCodigo(data.error ?? "ERROR") };
  }
  const meta = await construirMetaInforme(generadoPor);
  descargarExistenciasValorizadasPdf(data.lotes, data.genericos, meta);
  return { ok: true };
}

export async function ejecutarExistenciasValorizadasExcel(
  isDemoMode: boolean,
  generadoPor: string,
): Promise<ResultadoInforme> {
  const lotesRes = await resolverLotesInforme(isDemoMode);
  if (!Array.isArray(lotesRes)) {
    return { ok: false, mensaje: mensajeErrorCodigo(lotesRes.error ?? "ERROR") };
  }
  const meta = await construirMetaInforme(generadoPor);
  await descargarExistenciasValorizadasExcel(lotesRes, meta);
  return { ok: true };
}

export async function ejecutarVencimientosPdf(
  isDemoMode: boolean,
  generadoPor: string,
): Promise<ResultadoInforme> {
  const lotesRes = await resolverLotesInforme(isDemoMode);
  if (!Array.isArray(lotesRes)) {
    return { ok: false, mensaje: mensajeErrorCodigo(lotesRes.error ?? "ERROR") };
  }
  const meta = await construirMetaInforme(generadoPor);
  descargarVencimientosPdf(lotesRes, meta);
  return { ok: true };
}

export async function ejecutarVencimientosExcel(
  isDemoMode: boolean,
  generadoPor: string,
): Promise<ResultadoInforme> {
  const lotesRes = await resolverLotesInforme(isDemoMode);
  if (!Array.isArray(lotesRes)) {
    return { ok: false, mensaje: mensajeErrorCodigo(lotesRes.error ?? "ERROR") };
  }
  const meta = await construirMetaInforme(generadoPor);
  await descargarVencimientosExcel(lotesRes, meta);
  return { ok: true };
}

export async function ejecutarStockBajoPdf(
  isDemoMode: boolean,
  generadoPor: string,
): Promise<ResultadoInforme> {
  const data = await cargarLotesYGenericos(isDemoMode);
  if ("error" in data) {
    return { ok: false, mensaje: mensajeErrorCodigo(data.error ?? "ERROR") };
  }
  const meta = await construirMetaInforme(generadoPor);
  descargarStockBajoPdf(data.lotes, data.genericos, meta);
  return { ok: true };
}

export async function ejecutarStockBajoExcel(
  isDemoMode: boolean,
  generadoPor: string,
): Promise<ResultadoInforme> {
  const data = await cargarLotesYGenericos(isDemoMode);
  if ("error" in data) {
    return { ok: false, mensaje: mensajeErrorCodigo(data.error ?? "ERROR") };
  }
  const meta = await construirMetaInforme(generadoPor);
  await descargarStockBajoExcel(data.lotes, data.genericos, meta);
  return { ok: true };
}

export async function ejecutarHojaConteoPdf(
  isDemoMode: boolean,
  generadoPor: string,
  filtroUbicacion?: string | null,
): Promise<ResultadoInforme> {
  const lotesRes = await resolverLotesInforme(isDemoMode);
  if (!Array.isArray(lotesRes)) {
    return { ok: false, mensaje: mensajeErrorCodigo(lotesRes.error ?? "ERROR") };
  }
  const meta = await construirMetaInforme(generadoPor);
  descargarHojaConteoFisicoPdf(lotesRes, meta, filtroUbicacion);
  return { ok: true };
}

export async function ejecutarKardexPdf(
  isDemoMode: boolean,
  generadoPor: string,
): Promise<ResultadoInforme> {
  const kardexRes = await resolverKardexInforme(isDemoMode, {});
  if ("error" in kardexRes) {
    return { ok: false, mensaje: mensajeErrorCodigo(kardexRes.error ?? "ERROR") };
  }
  const meta = await construirMetaInforme(generadoPor);
  descargarKardexPdf(kardexRes.filas, {}, meta);
  return {
    ok: true,
    mensaje: `PDF generado con ${kardexRes.filas.length} movimientos.`,
  };
}

export async function ejecutarKardexExcel(
  isDemoMode: boolean,
  generadoPor: string,
): Promise<ResultadoInforme> {
  const kardexRes = await resolverKardexInforme(isDemoMode, {});
  if ("error" in kardexRes) {
    return { ok: false, mensaje: mensajeErrorCodigo(kardexRes.error ?? "ERROR") };
  }
  const meta = await construirMetaInforme(generadoPor);
  await descargarKardexExcel(kardexRes.filas, {}, meta);
  return {
    ok: true,
    mensaje: `Excel generado con ${kardexRes.filas.length} movimientos.`,
  };
}
