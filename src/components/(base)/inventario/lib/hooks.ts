import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import {
  DEMO_PRODUCTOS,
  DEMO_PROVEEDORES,
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
        return DEMO_PRODUCTOS.map((p, i) => {
          const prov = DEMO_PROVEEDORES[i % DEMO_PROVEEDORES.length];
          return {
          id: `demo-lote-${p.id}`,
          producto_id: p.id,
          codigo_barras: `DEMO-${String(i + 1).padStart(4, "0")}`,
          numero_lote: `L-${2400 + i}`,
          cantidad_inicial: p.stock_actual,
          cantidad_actual: p.stock_actual,
          precio_costo: Math.round(p.precio_base * 0.65 * 100) / 100,
          precio_venta: p.precio_base,
          proveedor_id: prov.id,
          laboratorio: prov.nombre,
          fecha_vencimiento: `2026-${String((i % 12) + 1).padStart(2, "0")}-28`,
          ubicacion: "Demo",
          activo: p.activo,
          inv_proveedores: { nombre: prov.nombre },
          inv_productos: {
            id: p.id,
            nombre: p.nombre,
            nombre_generico: p.nombre_generico,
            concentracion: p.concentracion,
            forma_farmaceutica: p.forma_farmaceutica,
            presentacion: p.presentacion,
            unidad_venta: p.unidad_venta,
            requiere_receta: p.requiere_receta,
            precio_base: p.precio_base,
            stock_minimo: p.stock_minimo,
            stock_actual: p.stock_actual,
            activo: p.activo,
          },
        };
        });
      }
      const res = await obtenerLotes();
      if (!res.success) throw new Error(res.code);
      return res.data;
    },
    staleTime: 1000 * 60 * 3,
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
        DEMO_PRODUCTOS,
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
      if (!res.success) {
        const err = new Error(res.code) as Error & { detail?: string };
        if ("detail" in res && res.detail) err.detail = res.detail;
        throw err;
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["inventario", "lotes"] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
