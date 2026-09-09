"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import {
  DEMO_CUENTAS_COBRAR,
  DEMO_CUENTAS_PAGAR,
  DEMO_RESUMEN_FINANCIERO,
  demoMovimientosFinancieros,
} from "@/lib/demo/fixtures";
import {
  assertWritableDemo,
  demoQueryKey,
  resolveDemoData,
} from "@/lib/demo/helpers";
import {
  obtenerMovimientosFinancieros,
  obtenerResumenFinanciero,
  registrarMovimiento,
  eliminarMovimiento,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
  type ObtenerMovimientosParams,
} from "./actions";
import type { RegistrarMovimientoInput } from "./zod";

export const FINANZAS_KEYS = {
  all: ["finanzas"] as const,
  list: (params: ObtenerMovimientosParams, isDemoMode: boolean) =>
    demoQueryKey(["finanzas", "list", params], isDemoMode),
  resumen: (isDemoMode: boolean, desde?: string, hasta?: string) =>
    demoQueryKey(["finanzas", "resumen", { desde, hasta }], isDemoMode),
  cuentasCobrar: (isDemoMode: boolean) =>
    demoQueryKey(["finanzas", "cuentasCobrar"], isDemoMode),
  cuentasPagar: (isDemoMode: boolean) =>
    demoQueryKey(["finanzas", "cuentasPagar"], isDemoMode),
};

export function useMovimientosFinancieros(params: ObtenerMovimientosParams) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: FINANZAS_KEYS.list(params, isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        () => obtenerMovimientosFinancieros(params),
        () => demoMovimientosFinancieros(params.page, params.pageSize),
      ),
    staleTime: 1000 * 60,
  });
}

export function useResumenFinanciero(desde?: string, hasta?: string) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: FINANZAS_KEYS.resumen(isDemoMode, desde, hasta),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        () => obtenerResumenFinanciero(desde, hasta),
        DEMO_RESUMEN_FINANCIERO,
      ),
    staleTime: 1000 * 60,
  });
}

export function useCuentasPorCobrar() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: FINANZAS_KEYS.cuentasCobrar(isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        () => obtenerCuentasPorCobrar(),
        DEMO_CUENTAS_COBRAR,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCuentasPorPagar() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: FINANZAS_KEYS.cuentasPagar(isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        () => obtenerCuentasPorPagar(),
        DEMO_CUENTAS_PAGAR,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useRegistrarMovimiento() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegistrarMovimientoInput) => {
      assertWritableDemo(isDemoMode);
      const result = await registrarMovimiento(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANZAS_KEYS.all });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useEliminarMovimiento() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      assertWritableDemo(isDemoMode);
      const result = await eliminarMovimiento(id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANZAS_KEYS.all });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
