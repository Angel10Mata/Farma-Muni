"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  list: (params: ObtenerMovimientosParams) => ["finanzas", "list", params] as const,
  resumen: () => ["finanzas", "resumen"] as const,
  cuentasCobrar: () => ["finanzas", "cuentasCobrar"] as const,
  cuentasPagar: () => ["finanzas", "cuentasPagar"] as const,
};

export function useMovimientosFinancieros(params: ObtenerMovimientosParams) {
  return useQuery({
    queryKey: FINANZAS_KEYS.list(params),
    queryFn: () => obtenerMovimientosFinancieros(params),
    staleTime: 1000 * 60, // 1 minuto
  });
}

export function useResumenFinanciero(desde?: string, hasta?: string) {
  return useQuery({
    queryKey: [...FINANZAS_KEYS.resumen(), { desde, hasta }],
    queryFn: () => obtenerResumenFinanciero(desde, hasta),
    staleTime: 1000 * 60, // 1 minuto
  });
}

export function useCuentasPorCobrar() {
  return useQuery({
    queryKey: FINANZAS_KEYS.cuentasCobrar(),
    queryFn: () => obtenerCuentasPorCobrar(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useCuentasPorPagar() {
  return useQuery({
    queryKey: FINANZAS_KEYS.cuentasPagar(),
    queryFn: () => obtenerCuentasPorPagar(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useRegistrarMovimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegistrarMovimientoInput) => {
      const result = await registrarMovimiento(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANZAS_KEYS.all });
    },
  });
}

export function useEliminarMovimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await eliminarMovimiento(id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANZAS_KEYS.all });
    },
  });
}
