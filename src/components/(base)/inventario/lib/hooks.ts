import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import {
  DEMO_CATALOGOS,
  DEMO_COMERCIALES_INVENTARIO,
  DEMO_GENERICOS_INVENTARIO,
  DEMO_LABORATORIOS,
  DEMO_LOTES_INVENTARIO,
  DEMO_PRODUCTOS,
  DEMO_UBICACIONES,
} from "@/lib/demo/fixtures";
import {
  assertWritableDemo,
  demoQueryKey,
  resolveDemoData,
} from "@/lib/demo/helpers";
import {
  obtenerProducto,
  obtenerProductos,
  guardarProducto,
  activarProducto,
  desactivarProducto,
  obtenerUbicaciones,
  obtenerLotes,
  registrarBajaPorVencimiento,
  crearLoteManual,
  buscarProductosSimilares,
  encontrarProductoDuplicadoExacto,
  obtenerKardex,
  ajustarLotePorConteo,
  darBajaLote,
  devolverLoteAProveedor,
  type ObtenerKardexResult,
} from "./actions";
import {
  guardarCatalogo,
  asignarLaboratorioComercial,
  guardarComercial,
  guardarGenerico,
  crearProveedorYLaboratorio,
  desligarLaboratorioDeProveedor,
  guardarLaboratorio,
  listarCatalogos,
  listarCatalogosResumen,
  listarComercialesInventario,
  listarGenericosInventario,
  listarLaboratorios,
  listarLaboratoriosPorProveedor,
  obtenerComercial,
} from "./jerarquia-actions";
import type {
  CatalogoInput,
  ComercialInput,
  GenericoInput,
  InventarioJerarquiaFiltros,
  LaboratorioInput,
} from "./jerarquia-zod";
import { demoKardexMovimientos } from "@/lib/demo/fixtures";
import {
  type AjustarConteoInput,
  type BajaLoteInput,
  type DevolverProveedorInput,
  type ObtenerKardexInput,
  type ProductFormValues,
  type ProductoSugerencia,
} from "./zod";
import {
  claveProductoUnico,
  FILTRO_LABORATORIO_SIN_ASIGNAR,
  MIN_CARACTERES_BUSQUEDA_PRODUCTO,
  normalizarTextoBusquedaProducto,
} from "./helpers";

function demoProductosSugerencia(texto: string): ProductoSugerencia[] {
  const needle = normalizarTextoBusquedaProducto(texto);
  if (needle.length < MIN_CARACTERES_BUSQUEDA_PRODUCTO) return [];
  return DEMO_PRODUCTOS.filter((p) => {
    const ng = normalizarTextoBusquedaProducto(p.nombre_generico);
    const n = normalizarTextoBusquedaProducto(p.nombre);
    return ng.includes(needle) || n.includes(needle);
  })
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      nombre_generico: p.nombre_generico,
      concentracion: p.concentracion,
      forma_farmaceutica: String(p.forma_farmaceutica),
      presentacion: p.presentacion,
      precio_base: p.precio_base,
    }));
}

function demoDuplicadoExacto(nombreGenerico: string): ProductoSugerencia | null {
  const clave = claveProductoUnico({ nombre_generico: nombreGenerico });
  const hit = DEMO_PRODUCTOS.find(
    (p) => claveProductoUnico({ nombre_generico: p.nombre_generico }) === clave,
  );
  if (!hit) return null;
  return {
    id: hit.id,
    nombre: hit.nombre,
    nombre_generico: hit.nombre_generico,
    concentracion: hit.concentracion,
    forma_farmaceutica: String(hit.forma_farmaceutica),
    presentacion: hit.presentacion,
    precio_base: hit.precio_base,
  };
}

// Modo edición en pantalla
export function useEditMode(initial = false) {
  const [isEditing, setIsEditing] = useState(initial);
  return {
    isEditing,
    enableEdit: () => setIsEditing(true),
    disableEdit: () => setIsEditing(false),
    toggleEdit: () => setIsEditing((prev) => !prev),
    setIsEditing,
  };
}

// Consultas de inventario
export function useLotes() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["inventario", "lotes"], isDemoMode),
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_LOTES_INVENTARIO;
      }
      const res = await obtenerLotes();
      if (!res.success) throw new Error(res.code);
      return res.data;
    },
    staleTime: 1000 * 60 * 3,
  });
}

const JERARQUIA_STALE = 1000 * 60 * 3;

export function useCatalogosInventario() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["inventario", "catalogos"], isDemoMode),
    queryFn: async () => {
      if (isDemoMode) return DEMO_CATALOGOS;
      const res = await listarCatalogos();
      if (!("success" in res) || !res.success) throw new Error(res.code ?? "ERROR");
      return res.data;
    },
    staleTime: JERARQUIA_STALE,
  });
}

export function useCatalogosResumenInventario() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["inventario", "catalogos-resumen"], isDemoMode),
    queryFn: async () => {
      if (isDemoMode) return [];
      const res = await listarCatalogosResumen();
      if (!("success" in res) || !res.success) throw new Error(res.code ?? "ERROR");
      return res.data;
    },
    staleTime: JERARQUIA_STALE,
  });
}

export function useGenericosInventario(filtros?: InventarioJerarquiaFiltros) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(
      [
        "inventario",
        "genericos",
        filtros?.catalogo_id,
        filtros?.generico_id,
      ],
      isDemoMode,
    ),
    queryFn: async () => {
      if (isDemoMode) {
        let rows = DEMO_GENERICOS_INVENTARIO;
        if (filtros?.catalogo_id) {
          rows = rows.filter((g) => g.catalogo_id === filtros.catalogo_id);
        }
        if (filtros?.generico_id) {
          rows = rows.filter((g) => g.generico_id === filtros.generico_id);
        }
        return rows;
      }
      const res = await listarGenericosInventario(filtros);
      if (!("success" in res) || !res.success) throw new Error(res.code ?? "ERROR");
      return res.data;
    },
    staleTime: JERARQUIA_STALE,
  });
}

export function useLaboratoriosInventario() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["inventario", "laboratorios"], isDemoMode),
    queryFn: async () => {
      if (isDemoMode) return DEMO_LABORATORIOS;
      const res = await listarLaboratorios();
      if (!("success" in res) || !res.success) throw new Error(res.code ?? "ERROR");
      return res.data;
    },
    staleTime: JERARQUIA_STALE,
  });
}

export function useLaboratoriosPorProveedor(proveedorId: string | null) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(
      ["inventario", "laboratorios-proveedor", proveedorId],
      isDemoMode,
    ),
    queryFn: async () => {
      if (!proveedorId) return [];
      if (isDemoMode) {
        return DEMO_LABORATORIOS.filter((l) => l.proveedor_id === proveedorId);
      }
      const res = await listarLaboratoriosPorProveedor(proveedorId);
      if (!("success" in res) || !res.success) throw new Error(res.code ?? "ERROR");
      return res.data;
    },
    enabled: !!proveedorId,
    staleTime: JERARQUIA_STALE,
  });
}

export function useComercialesInventario(
  filtros?: InventarioJerarquiaFiltros,
  options?: { enabled?: boolean },
) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: demoQueryKey(
      [
        "inventario",
        "comerciales",
        filtros?.catalogo_id,
        filtros?.generico_id,
        filtros?.laboratorio_id,
        filtros?.producto_id,
      ],
      isDemoMode,
    ),
    queryFn: async () => {
      if (isDemoMode) {
        let rows = DEMO_COMERCIALES_INVENTARIO;
        if (filtros?.catalogo_id) {
          rows = rows.filter((c) => c.catalogo_id === filtros.catalogo_id);
        }
        if (filtros?.generico_id) {
          rows = rows.filter((c) => c.generico_id === filtros.generico_id);
        }
        if (filtros?.laboratorio_id === FILTRO_LABORATORIO_SIN_ASIGNAR) {
          rows = rows.filter((c) => c.laboratorio_id == null);
        } else if (filtros?.laboratorio_id) {
          rows = rows.filter((c) => c.laboratorio_id === filtros.laboratorio_id);
        }
        if (filtros?.producto_id) {
          rows = rows.filter((c) => c.producto_id === filtros.producto_id);
        }
        return rows;
      }
      const res = await listarComercialesInventario(filtros);
      if (!("success" in res) || !res.success) throw new Error(res.code ?? "ERROR");
      return res.data;
    },
    staleTime: JERARQUIA_STALE,
  });
}

export function useComercialInventario(productoId: string | null) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["inventario", "comercial", productoId], isDemoMode),
    queryFn: async () => {
      if (!productoId) return null;
      if (isDemoMode) {
        const p = DEMO_PRODUCTOS.find((d) => d.id === productoId);
        return p ?? null;
      }
      const res = await obtenerComercial(productoId);
      if (!("success" in res) || !res.success) throw new Error(res.code ?? "ERROR");
      return res.data;
    },
    enabled: !!productoId,
    staleTime: JERARQUIA_STALE,
  });
}

function invalidateJerarquiaInventario(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["productos"] });
  queryClient.invalidateQueries({ queryKey: ["inventario", "catalogos"] });
  queryClient.invalidateQueries({ queryKey: ["inventario", "catalogos-resumen"] });
  queryClient.invalidateQueries({ queryKey: ["inventario", "genericos"] });
  queryClient.invalidateQueries({ queryKey: ["inventario", "laboratorios"] });
  queryClient.invalidateQueries({ queryKey: ["inventario", "comerciales"] });
  queryClient.invalidateQueries({ queryKey: ["inventario", "lotes"] });
  queryClient.invalidateQueries({ queryKey: ["proveedores"] });
  queryClient.invalidateQueries({ queryKey: ["inventario", "laboratorios-proveedor"] });
}

export function useGuardarCatalogoInventario() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: CatalogoInput }) => {
      assertWritableDemo(isDemoMode);
      const res = await guardarCatalogo(id, data);
      if (!("success" in res) || !res.success) {
        const code = "code" in res ? res.code : "ERROR";
        const err = new Error(code) as Error & { detail?: string };
        if ("detail" in res && res.detail) err.detail = res.detail;
        throw err;
      }
      return res;
    },
    onSuccess: () => invalidateJerarquiaInventario(queryClient),
  });
}

export function useGuardarGenericoInventario() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: GenericoInput }) => {
      assertWritableDemo(isDemoMode);
      const res = await guardarGenerico(id, data);
      if (!("success" in res) || !res.success) {
        const code = "code" in res ? res.code : "ERROR";
        const err = new Error(code) as Error & { detail?: string };
        if ("detail" in res && res.detail) err.detail = res.detail;
        throw err;
      }
      return res;
    },
    onSuccess: () => invalidateJerarquiaInventario(queryClient),
  });
}

export function useGuardarLaboratorioInventario() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: LaboratorioInput }) => {
      assertWritableDemo(isDemoMode);
      const res = await guardarLaboratorio(id, data);
      if (!("success" in res) || !res.success) {
        const code = "code" in res ? res.code : "ERROR";
        const err = new Error(code) as Error & { detail?: string };
        if ("detail" in res && res.detail) err.detail = res.detail;
        throw err;
      }
      return res;
    },
    onSuccess: () => invalidateJerarquiaInventario(queryClient),
  });
}

export function useDesligarLaboratorioProveedor() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      laboratorioId,
      proveedorId,
    }: {
      laboratorioId: string;
      proveedorId: string;
    }) => {
      assertWritableDemo(isDemoMode);
      const res = await desligarLaboratorioDeProveedor(laboratorioId, proveedorId);
      if (!("success" in res) || !res.success) {
        throw new Error("code" in res ? res.code : "ERROR");
      }
      return res;
    },
    onSuccess: () => invalidateJerarquiaInventario(queryClient),
  });
}

export function useCrearProveedorYLaboratorio() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof crearProveedorYLaboratorio>[0]) => {
      assertWritableDemo(isDemoMode);
      const res = await crearProveedorYLaboratorio(input);
      if (!("success" in res) || !res.success) {
        const code = "code" in res ? res.code : "ERROR";
        const err = new Error(code) as Error & { detail?: string };
        if ("detail" in res && res.detail) err.detail = res.detail;
        throw err;
      }
      return res;
    },
    onSuccess: () => invalidateJerarquiaInventario(queryClient),
  });
}

export function useAsignarLaboratorioComercial() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productoId,
      laboratorioId,
    }: {
      productoId: string;
      laboratorioId: string | null;
    }) => {
      assertWritableDemo(isDemoMode);
      const res = await asignarLaboratorioComercial(productoId, laboratorioId);
      if (!("success" in res) || !res.success) {
        const code = "code" in res ? res.code : "ERROR";
        const err = new Error(code) as Error & { detail?: string };
        if ("detail" in res && res.detail) err.detail = res.detail;
        throw err;
      }
      return res;
    },
    onSuccess: () => invalidateJerarquiaInventario(queryClient),
  });
}

export function useGuardarComercialInventario() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: ComercialInput }) => {
      assertWritableDemo(isDemoMode);
      const res = await guardarComercial(id, data);
      if (!("success" in res) || !res.success) {
        const code = "code" in res ? res.code : "ERROR";
        const err = new Error(code) as Error & { detail?: string };
        if ("detail" in res && res.detail) err.detail = res.detail;
        throw err;
      }
      return res;
    },
    onSuccess: () => invalidateJerarquiaInventario(queryClient),
  });
}

export function useProductos() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["productos"], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          const res = await obtenerProductos();
          if (!res.success) throw new Error(res.code);
          return res.data;
        },
        DEMO_PRODUCTOS as Awaited<ReturnType<typeof obtenerProductos>>["data"],
      ),
    staleTime: 1000 * 60 * 3,
  });
}

export function useProducto(id: string | null) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["producto", id], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          if (!id) return null;
          const res = await obtenerProducto(id);
          if (!res.success) throw new Error(res.code);
          return res.data;
        },
        () => DEMO_PRODUCTOS.find((p) => p.id === id) ?? null,
      ),
    enabled: !!id,
    staleTime: 1000 * 60 * 3,
  });
}

export function useUbicaciones() {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(["ubicaciones"], isDemoMode),
    queryFn: () =>
      resolveDemoData(
        isDemoMode,
        async () => {
          const res = await obtenerUbicaciones();
          if (!res.success) throw new Error(res.code);
          return res.data;
        },
        DEMO_UBICACIONES,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

// Guardar y cambios de catálogo
export function useGuardarProducto() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: ProductFormValues }) => {
      assertWritableDemo(isDemoMode);
      const res = await guardarProducto(id, data);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
}

export function useBuscarProductosSimilares(texto: string, enabled: boolean) {
  const { isDemoMode } = useDemoMode();
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(texto.trim()), 300);
    return () => window.clearTimeout(id);
  }, [texto]);

  return useQuery({
    queryKey: demoQueryKey(["inventario", "productos-similares", debounced], isDemoMode),
    queryFn: async () => {
      if (debounced.length < MIN_CARACTERES_BUSQUEDA_PRODUCTO) return [];
      if (isDemoMode) return demoProductosSugerencia(debounced);
      const res = await buscarProductosSimilares(debounced);
      if (!res.success) throw new Error(res.code ?? "ERROR");
      return res.data;
    },
    enabled: enabled && debounced.length >= MIN_CARACTERES_BUSQUEDA_PRODUCTO,
    staleTime: 30_000,
  });
}

export function useProductoDuplicadoExacto(nombreGenerico: string, enabled: boolean) {
  const { isDemoMode } = useDemoMode();
  const [debounced, setDebounced] = useState(nombreGenerico);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(nombreGenerico), 300);
    return () => window.clearTimeout(id);
  }, [nombreGenerico]);

  const isDebouncing = nombreGenerico !== debounced;

  const query = useQuery({
    queryKey: demoQueryKey(
      ["inventario", "producto-duplicado", debounced],
      isDemoMode,
    ),
    queryFn: async () => {
      if (isDemoMode) return demoDuplicadoExacto(debounced);
      const res = await encontrarProductoDuplicadoExacto(debounced);
      if (!res.success) throw new Error(res.code ?? "ERROR");
      return res.data;
    },
    enabled: enabled && !isDebouncing,
    staleTime: 10_000,
  });

  return { ...query, isDebouncing };
}

export function useCrearLoteManual() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof crearLoteManual>[0]) => {
      assertWritableDemo(isDemoMode);
      const res = await crearLoteManual(input);
      if (!("success" in res) || !res.success) {
        const code = "code" in res ? res.code : "ERROR";
        const err = new Error(code) as Error & { detail?: string };
        if ("detail" in res && res.detail) err.detail = res.detail;
        throw err;
      }
      return res;
    },
    onSuccess: () => invalidateJerarquiaInventario(queryClient),
  });
}

export function useRegistrarBajaVencido() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BajaLoteInput) => {
      assertWritableDemo(isDemoMode);
      const res = await registrarBajaPorVencimiento(input);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["inventario", "lotes"] });
      queryClient.invalidateQueries({ queryKey: ["inventario", "kardex"] });
    },
  });
}

export function useAjustarLotePorConteo() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AjustarConteoInput) => {
      assertWritableDemo(isDemoMode);
      const res = await ajustarLotePorConteo(input);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["inventario", "lotes"] });
      queryClient.invalidateQueries({ queryKey: ["inventario", "kardex"] });
    },
  });
}

export function useDarBajaLote() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BajaLoteInput) => {
      assertWritableDemo(isDemoMode);
      const res = await darBajaLote(input);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["inventario", "lotes"] });
      queryClient.invalidateQueries({ queryKey: ["inventario", "kardex"] });
    },
  });
}

export function useDevolverLoteAProveedor() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DevolverProveedorInput) => {
      assertWritableDemo(isDemoMode);
      const res = await devolverLoteAProveedor(input);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["inventario", "lotes"] });
      queryClient.invalidateQueries({ queryKey: ["inventario", "kardex"] });
    },
  });
}

export function useKardex(params: ObtenerKardexInput) {
  const { isDemoMode } = useDemoMode();
  return useQuery({
    queryKey: demoQueryKey(
      [
        "inventario",
        "kardex",
        params.productoId,
        params.loteId,
        params.tipo,
        params.desde,
        params.hasta,
        params.pagina,
      ],
      isDemoMode,
    ),
    queryFn: async (): Promise<ObtenerKardexResult> => {
      if (isDemoMode) {
        return demoKardexMovimientos({
          productoId: params.productoId,
          loteId: params.loteId,
          tipo: params.tipo,
          desde: params.desde,
          hasta: params.hasta,
          pagina: params.pagina,
        });
      }
      const res = await obtenerKardex(params);
      if ("code" in res) throw new Error(res.code);
      return res.data;
    },
    staleTime: 1000 * 60,
  });
}

export function useDesactivarProducto() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      assertWritableDemo(isDemoMode);
      const res = await desactivarProducto(id);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => invalidateJerarquiaInventario(queryClient),
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useActivarProducto() {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      assertWritableDemo(isDemoMode);
      const res = await activarProducto(id);
      if (!res.success) throw new Error(res.code);
      return res;
    },
    onSuccess: () => invalidateJerarquiaInventario(queryClient),
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
