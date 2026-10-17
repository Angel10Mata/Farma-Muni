import {
  DEMO_GENERICOS_INVENTARIO,
  DEMO_LOTES_INVENTARIO,
} from "@/lib/demo/fixtures";
import { demoKardexMovimientos } from "@/lib/demo/fixtures";
import { listarGenericosInforme, listarKardexInforme, listarLotesInforme } from "./datos-informes";
import type { KardexFila, LoteInventario, ObtenerKardexInput } from "../lib/zod";
import {
  mapLoteInventarioAFilaInforme,
  type FilaLoteInforme,
} from "./lote-informe";
import type { InvGenerico } from "../lib/jerarquia-zod";

export async function resolverLotesInforme(
  isDemoMode: boolean,
): Promise<FilaLoteInforme[] | { error: string }> {
  if (isDemoMode) {
    return (DEMO_LOTES_INVENTARIO as LoteInventario[]).map(mapLoteInventarioAFilaInforme);
  }
  const res = await listarLotesInforme();
  if (!("success" in res)) {
    return { error: res.code ?? "ERROR" };
  }
  return res.data;
}

export async function resolverGenericosInforme(
  isDemoMode: boolean,
): Promise<InvGenerico[] | { error: string }> {
  if (isDemoMode) {
    return DEMO_GENERICOS_INVENTARIO;
  }
  const res = await listarGenericosInforme();
  if (!("success" in res)) {
    return { error: res.code ?? "ERROR" };
  }
  return res.data;
}

export async function resolverKardexInforme(
  isDemoMode: boolean,
  params: ObtenerKardexInput,
): Promise<{ filas: KardexFila[] } | { error: string }> {
  if (isDemoMode) {
    const data = demoKardexMovimientos({
      productoId: params.productoId,
      loteId: params.loteId,
      tipo: params.tipo,
      desde: params.desde,
      hasta: params.hasta,
      pagina: 1,
      pageSize: 50_000,
    });
    return { filas: data.filas };
  }
  const res = await listarKardexInforme(params);
  if (!("success" in res)) {
    return { error: res.code ?? "ERROR" };
  }
  return { filas: res.data };
}
