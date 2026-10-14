"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireInventario, requireRole } from "@/lib/auth-guards";

const COMERCIAL_WRITE_ROLES = ["super", "admin", "inventario", "proveedores"] as const;
import {
  FILTRO_LABORATORIO_SIN_ASIGNAR,
  MIN_CARACTERES_BUSQUEDA_PRODUCTO,
  normalizarTextoBusquedaProducto,
} from "./helpers";
import {
  catalogoInputSchema,
  comercialInputSchema,
  DUPLICATE_CATALOGO_MSG,
  DUPLICATE_COMERCIAL_MSG,
  DUPLICATE_GENERICO_MSG,
  DUPLICATE_LABORATORIO_MSG,
  genericoInputSchema,
  invCatalogoSchema,
  invCatalogoResumenSchema,
  invGenericoSchema,
  invLaboratorioSchema,
  crearProveedorYLaboratorioInputSchema,
  laboratorioCreateInputSchema,
  laboratorioInputSchema,
  laboratorioUpdateInputSchema,
  productoComercialSchema,
  type CatalogoInput,
  type ComercialInput,
  type GenericoInput,
  type InvCatalogo,
  type InvCatalogoResumen,
  type InvGenerico,
  type InvLaboratorio,
  type InventarioJerarquiaFiltros,
  type CrearProveedorYLaboratorioInput,
  type LaboratorioInput,
  type ProductoComercial,
} from "./jerarquia-zod";

const INVENTARIO_PATH = "/farmamuni/inventario";
const PROVEEDORES_PATH = "/farmamuni/proveedores";

const LABORATORIO_SELECT =
  "id, nombre, activo, created_at, proveedor_id, inv_proveedores(nombre)";

const V_INV_COMERCIALES_SELECT =
  "producto_id, nombre_comercial, presentacion, precio_venta, imagen_url, activo, generico_id, generico_nombre, requiere_receta, catalogo_id, catalogo_nombre, laboratorio_id, laboratorio_nombre, stock_vendible, proximo_vencimiento, lotes_vendibles, concentracion, forma_farmaceutica, unidad_venta, stock_minimo, generico_activo, descripcion, created_at";

const V_INV_GENERICOS_SELECT =
  "generico_id, catalogo_id, catalogo_nombre, concentracion, forma_farmaceutica, generico_nombre, requiere_receta, stock_minimo, activo, comerciales, comerciales_con_stock, stock_vendible, precio_desde, bajo_minimo";

type ActionFail = { code: string; detail?: string };

function mapJerarquiaDbError(error: { code?: string; message?: string }): ActionFail {
  const raw = error.message ?? "";
  const msg = raw.toLowerCase();
  if (error.code === "23503") {
    return {
      code: "VALIDATION",
      detail: "Falta o no es válido un vínculo (catálogo, genérico, laboratorio o proveedor).",
    };
  }
  if (error.code === "23514") {
    return { code: "VALIDATION", detail: "Algún valor no cumple las reglas de inventario." };
  }
  if (error.code === "23502" && msg.includes("nombre_generico")) {
    return {
      code: "VALIDATION",
      detail: "Falta el nombre genérico del producto. Actualiza la app o contacta soporte.",
    };
  }
  if (error.code === "42501" || msg.includes("permission denied") || msg.includes("rls")) {
    return { code: "FORBIDDEN" };
  }
  if (error.code !== "23505") {
    return { code: "INTERNAL", detail: raw.trim() || undefined };
  }
  if (msg.includes("inv_catalogos_nombre_norm_uq")) {
    return { code: "DUPLICATE", detail: DUPLICATE_CATALOGO_MSG };
  }
  if (msg.includes("inv_genericos_catalogo_conc_forma_uq")) {
    return { code: "DUPLICATE", detail: DUPLICATE_GENERICO_MSG };
  }
  if (msg.includes("inv_laboratorios_nombre_norm_uq")) {
    return { code: "DUPLICATE", detail: DUPLICATE_LABORATORIO_MSG };
  }
  if (msg.includes("inv_productos_comercial_uq")) {
    return { code: "DUPLICATE", detail: DUPLICATE_COMERCIAL_MSG };
  }
  return { code: "DUPLICATE", detail: "Ya existe un registro con los mismos datos" };
}

function mapFilaCatalogo(row: Record<string, unknown>): InvCatalogo | null {
  const parsed = invCatalogoSchema.safeParse({
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? null,
    activo: Boolean(row.activo),
    created_at: row.created_at,
  });
  return parsed.success ? parsed.data : null;
}

function mapFilaLaboratorio(row: Record<string, unknown>): InvLaboratorio | null {
  const provJoin = row.inv_proveedores;
  let proveedorNombre: string | null = null;
  if (provJoin && typeof provJoin === "object" && "nombre" in provJoin) {
    proveedorNombre = String((provJoin as { nombre: string }).nombre);
  }
  const parsed = invLaboratorioSchema.safeParse({
    id: row.id,
    nombre: row.nombre,
    activo: Boolean(row.activo),
    proveedor_id: row.proveedor_id ?? null,
    proveedor_nombre: proveedorNombre,
    created_at: row.created_at,
  });
  return parsed.success ? parsed.data : null;
}

function mapFilaGenerico(row: Record<string, unknown>): InvGenerico | null {
  const parsed = invGenericoSchema.safeParse({
    generico_id: row.generico_id,
    catalogo_id: row.catalogo_id,
    catalogo_nombre: row.catalogo_nombre,
    concentracion: row.concentracion,
    forma_farmaceutica: row.forma_farmaceutica,
    generico_nombre: row.generico_nombre,
    requiere_receta: Boolean(row.requiere_receta),
    stock_minimo: Number(row.stock_minimo) || 0,
    activo: Boolean(row.activo),
    comerciales: Number(row.comerciales) || 0,
    comerciales_con_stock: Number(row.comerciales_con_stock) || 0,
    stock_vendible: Number(row.stock_vendible) || 0,
    precio_desde:
      row.precio_desde != null && row.precio_desde !== ""
        ? Number(row.precio_desde)
        : null,
    bajo_minimo: Boolean(row.bajo_minimo),
  });
  return parsed.success ? parsed.data : null;
}

function mapFilaComercial(row: Record<string, unknown>): ProductoComercial | null {
  const genericoId = row.generico_id;
  const laboratorioId = row.laboratorio_id;
  const parsed = productoComercialSchema.safeParse({
    producto_id: row.producto_id,
    nombre_comercial: row.nombre_comercial,
    presentacion: row.presentacion,
    precio_venta: Number(row.precio_venta) || 0,
    imagen_url: row.imagen_url ?? null,
    activo: Boolean(row.activo),
    generico_id: genericoId,
    generico_nombre: row.generico_nombre,
    requiere_receta: Boolean(row.requiere_receta),
    catalogo_id: row.catalogo_id,
    catalogo_nombre: row.catalogo_nombre,
    laboratorio_id: laboratorioId,
    laboratorio_nombre: row.laboratorio_nombre,
    stock_vendible: Number(row.stock_vendible) || 0,
    proximo_vencimiento: row.proximo_vencimiento != null ? String(row.proximo_vencimiento) : null,
    lotes_vendibles: Number(row.lotes_vendibles) || 0,
    concentracion: row.concentracion,
    forma_farmaceutica: row.forma_farmaceutica,
    unidad_venta: row.unidad_venta ?? "unidad",
    stock_minimo: Number(row.stock_minimo) || 0,
    generico_activo: Boolean(row.generico_activo),
    descripcion: row.descripcion ?? null,
    created_at: row.created_at,
    generico:
      genericoId
        ? {
            generico_id: genericoId,
            generico_nombre: row.generico_nombre,
            concentracion: row.concentracion,
            forma_farmaceutica: row.forma_farmaceutica,
            requiere_receta: Boolean(row.requiere_receta),
            unidad_venta: row.unidad_venta ?? "unidad",
            stock_minimo: Number(row.stock_minimo) || 0,
            generico_activo: Boolean(row.generico_activo),
          }
        : undefined,
    laboratorio:
      laboratorioId && row.laboratorio_nombre
        ? {
            id: laboratorioId,
            nombre: row.laboratorio_nombre,
          }
        : undefined,
  });
  return parsed.success ? parsed.data : null;
}

async function requireLecturaInventario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, code: "UNAUTHORIZED" as const };
  }
  return { ok: true as const, supabase };
}

function claveGenericoUnica(input: {
  concentracion: string;
  forma_farmaceutica: string;
}): string {
  return `${normalizarTextoBusquedaProducto(input.concentracion)}|${normalizarTextoBusquedaProducto(input.forma_farmaceutica)}`;
}

function claveComercialUnica(input: {
  generico_id: string;
  laboratorio_id: string | null | undefined;
  nombre_comercial: string;
  presentacion: string;
}): string {
  const labKey = input.laboratorio_id ?? FILTRO_LABORATORIO_SIN_ASIGNAR;
  return [
    input.generico_id,
    labKey,
    normalizarTextoBusquedaProducto(input.nombre_comercial),
    normalizarTextoBusquedaProducto(input.presentacion),
  ].join("|");
}

export async function listarCatalogos() {
  try {
    const auth = await requireLecturaInventario();
    if (!auth.ok) return { code: auth.code };

    const { data, error } = await auth.supabase
      .from("inv_catalogos")
      .select("id, nombre, descripcion, activo, created_at")
      .order("nombre", { ascending: true });

    if (error) return { code: "INTERNAL" as const };

    const items: InvCatalogo[] = [];
    for (const row of data ?? []) {
      const item = mapFilaCatalogo(row as Record<string, unknown>);
      if (item) items.push(item);
    }
    return { success: true as const, data: items };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function listarCatalogosResumen() {
  try {
    const auth = await requireLecturaInventario();
    if (!auth.ok) return { code: auth.code };

    const [catRes, genRes] = await Promise.all([
      auth.supabase
        .from("inv_catalogos")
        .select("id, nombre, descripcion, activo, created_at")
        .order("nombre", { ascending: true }),
      auth.supabase.from("v_inv_genericos").select(V_INV_GENERICOS_SELECT),
    ]);

    if (catRes.error || genRes.error) return { code: "INTERNAL" as const };

    const agg = new Map<string, { genericos: number; stock_vendible: number }>();
    for (const row of genRes.data ?? []) {
      const catalogoId = String(row.catalogo_id);
      const prev = agg.get(catalogoId) ?? { genericos: 0, stock_vendible: 0 };
      prev.genericos += 1;
      prev.stock_vendible += Number(row.stock_vendible) || 0;
      agg.set(catalogoId, prev);
    }

    const items: InvCatalogoResumen[] = [];
    for (const row of catRes.data ?? []) {
      const base = mapFilaCatalogo(row as Record<string, unknown>);
      if (!base) continue;
      const stats = agg.get(base.id) ?? { genericos: 0, stock_vendible: 0 };
      const parsed = invCatalogoResumenSchema.safeParse({
        ...base,
        genericos: stats.genericos,
        stock_vendible: stats.stock_vendible,
      });
      if (parsed.success) items.push(parsed.data);
    }

    return { success: true as const, data: items };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function listarGenericosInventario(filtros?: InventarioJerarquiaFiltros) {
  try {
    const auth = await requireLecturaInventario();
    if (!auth.ok) return { code: auth.code };

    let query = auth.supabase
      .from("v_inv_genericos")
      .select(V_INV_GENERICOS_SELECT)
      .order("generico_nombre", { ascending: true });

    if (filtros?.catalogo_id) {
      query = query.eq("catalogo_id", filtros.catalogo_id);
    }
    if (filtros?.generico_id) {
      query = query.eq("generico_id", filtros.generico_id);
    }

    const { data, error } = await query;
    if (error) return { code: "INTERNAL" as const };

    const items: InvGenerico[] = [];
    for (const row of data ?? []) {
      const item = mapFilaGenerico(row as Record<string, unknown>);
      if (item) items.push(item);
    }
    return { success: true as const, data: items };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function listarGenericosPorCatalogo(catalogoId: string) {
  try {
    const auth = await requireLecturaInventario();
    if (!auth.ok) return { code: auth.code };

    const { data, error } = await auth.supabase
      .from("v_inv_genericos")
      .select(V_INV_GENERICOS_SELECT)
      .eq("catalogo_id", catalogoId)
      .order("concentracion", { ascending: true });

    if (error) return { code: "INTERNAL" as const };

    const items: InvGenerico[] = [];
    for (const row of data ?? []) {
      const item = mapFilaGenerico(row as Record<string, unknown>);
      if (item) items.push(item);
    }
    return { success: true as const, data: items };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function listarLaboratorios() {
  try {
    const auth = await requireLecturaInventario();
    if (!auth.ok) return { code: auth.code };

    const { data, error } = await auth.supabase
      .from("inv_laboratorios")
      .select(LABORATORIO_SELECT)
      .order("nombre", { ascending: true });

    if (error) return { code: "INTERNAL" as const };

    const items: InvLaboratorio[] = [];
    for (const row of data ?? []) {
      const item = mapFilaLaboratorio(row as Record<string, unknown>);
      if (item) items.push(item);
    }
    return { success: true as const, data: items };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function listarComercialesInventario(filtros?: InventarioJerarquiaFiltros) {
  try {
    const auth = await requireLecturaInventario();
    if (!auth.ok) return { code: auth.code };

    let query = auth.supabase
      .from("v_inv_comerciales")
      .select(V_INV_COMERCIALES_SELECT)
      .order("nombre_comercial", { ascending: true });

    if (filtros?.catalogo_id) query = query.eq("catalogo_id", filtros.catalogo_id);
    if (filtros?.generico_id) query = query.eq("generico_id", filtros.generico_id);
    if (filtros?.laboratorio_id === FILTRO_LABORATORIO_SIN_ASIGNAR) {
      query = query.is("laboratorio_id", null);
    } else if (filtros?.laboratorio_id) {
      query = query.eq("laboratorio_id", filtros.laboratorio_id);
    }
    if (filtros?.producto_id) query = query.eq("producto_id", filtros.producto_id);

    const { data, error } = await query;
    if (error) return { code: "INTERNAL" as const };

    const items: ProductoComercial[] = [];
    for (const row of data ?? []) {
      const item = mapFilaComercial(row as Record<string, unknown>);
      if (item) items.push(item);
    }
    return { success: true as const, data: items };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function obtenerComercial(productoId: string) {
  try {
    const auth = await requireLecturaInventario();
    if (!auth.ok) return { code: auth.code };

    const { data, error } = await auth.supabase
      .from("v_inv_comerciales")
      .select(V_INV_COMERCIALES_SELECT)
      .eq("producto_id", productoId)
      .maybeSingle();

    if (error || !data) return { code: "NOT_FOUND" as const };
    const item = mapFilaComercial(data as Record<string, unknown>);
    if (!item) return { code: "NOT_FOUND" as const };
    return { success: true as const, data: item };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function listarComercialesPorGenerico(
  genericoId: string,
  opts?: { soloVendibles?: boolean },
) {
  try {
    const auth = await requireLecturaInventario();
    if (!auth.ok) return { code: auth.code };

    const { data, error } = await auth.supabase
      .from("v_inv_comerciales")
      .select(V_INV_COMERCIALES_SELECT)
      .eq("generico_id", genericoId)
      .order("nombre_comercial", { ascending: true });

    if (error) return { code: "INTERNAL" as const };

    const soloVendibles = opts?.soloVendibles ?? false;
    const items: ProductoComercial[] = [];
    for (const row of data ?? []) {
      const item = mapFilaComercial(row as Record<string, unknown>);
      if (!item) continue;
      if (soloVendibles) {
        if (!item.activo || item.stock_vendible <= 0) continue;
      }
      items.push(item);
    }
    return { success: true as const, data: items };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function buscarComercialesPorNombre(
  texto: string,
  opts?: { incluirInactivosYAgotados?: boolean; limite?: number },
) {
  try {
    const auth = await requireLecturaInventario();
    if (!auth.ok) return { code: auth.code };

    const term = texto.trim();
    const limite = opts?.limite ?? 20;
    if (term.length < MIN_CARACTERES_BUSQUEDA_PRODUCTO) {
      return { success: true as const, data: [] as ProductoComercial[] };
    }

    const needle = normalizarTextoBusquedaProducto(term);
    const incluirTodos = opts?.incluirInactivosYAgotados ?? false;

    const { data, error } = await auth.supabase
      .from("v_inv_comerciales")
      .select(V_INV_COMERCIALES_SELECT)
      .order("nombre_comercial", { ascending: true })
      .limit(800);

    if (error) return { code: "INTERNAL" as const };

    const items: ProductoComercial[] = [];
    for (const row of data ?? []) {
      const item = mapFilaComercial(row as Record<string, unknown>);
      if (!item) continue;
      const nombreNorm = normalizarTextoBusquedaProducto(item.nombre_comercial);
      const genericoNorm = normalizarTextoBusquedaProducto(item.generico_nombre);
      const catalogoNorm = normalizarTextoBusquedaProducto(item.catalogo_nombre);
      if (!nombreNorm.includes(needle) && !genericoNorm.includes(needle) && !catalogoNorm.includes(needle)) {
        continue;
      }
      if (!incluirTodos) {
        if (!item.activo || item.stock_vendible <= 0) continue;
      }
      items.push(item);
      if (items.length >= limite) break;
    }

    return { success: true as const, data: items };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function guardarCatalogo(id: string | undefined, input: CatalogoInput) {
  try {
    const guard = await requireInventario();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const parsed = catalogoInputSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const nombre = parsed.data.nombre.trim();
    const needle = normalizarTextoBusquedaProducto(nombre);
    const { data: existentes } = await supabase
      .from("inv_catalogos")
      .select("id, nombre");
    for (const row of existentes ?? []) {
      if (id && row.id === id) continue;
      if (normalizarTextoBusquedaProducto(String(row.nombre)) === needle) {
        return { code: "DUPLICATE" as const, detail: DUPLICATE_CATALOGO_MSG };
      }
    }

    const payload = {
      nombre,
      descripcion: parsed.data.descripcion?.trim() || null,
      activo: parsed.data.activo,
    };

    if (id) {
      const { error } = await supabase.from("inv_catalogos").update(payload).eq("id", id);
      if (error) {
        const mapped = mapJerarquiaDbError(error);
        return mapped;
      }
      revalidatePath(INVENTARIO_PATH);
      return { success: true as const, id };
    }

    const { data: inserted, error } = await supabase
      .from("inv_catalogos")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      return mapJerarquiaDbError(error);
    }
    if (!inserted?.id) return { code: "INTERNAL" as const };

    revalidatePath(INVENTARIO_PATH);
    return { success: true as const, id: inserted.id as string };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function guardarGenerico(id: string | undefined, input: GenericoInput) {
  try {
    const guard = await requireInventario();
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const parsed = genericoInputSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const claveNueva = claveGenericoUnica(parsed.data);
    const { data: delMismoCatalogo } = await supabase
      .from("inv_genericos")
      .select("id, concentracion, forma_farmaceutica")
      .eq("catalogo_id", parsed.data.catalogo_id);

    for (const row of delMismoCatalogo ?? []) {
      if (id && row.id === id) continue;
      if (
        claveGenericoUnica({
          concentracion: String(row.concentracion),
          forma_farmaceutica: String(row.forma_farmaceutica),
        }) === claveNueva
      ) {
        return { code: "DUPLICATE" as const, detail: DUPLICATE_GENERICO_MSG };
      }
    }

    const payload = {
      catalogo_id: parsed.data.catalogo_id,
      concentracion: parsed.data.concentracion.trim(),
      forma_farmaceutica: parsed.data.forma_farmaceutica,
      requiere_receta: parsed.data.requiere_receta,
      unidad_venta: parsed.data.unidad_venta.trim() || "unidad",
      stock_minimo: parsed.data.stock_minimo,
      activo: parsed.data.activo,
    };

    if (id) {
      const { error } = await supabase.from("inv_genericos").update(payload).eq("id", id);
      if (error) return mapJerarquiaDbError(error);
      revalidatePath(INVENTARIO_PATH);
      return { success: true as const, id };
    }

    const { data: inserted, error } = await supabase
      .from("inv_genericos")
      .insert(payload)
      .select("id")
      .single();

    if (error) return mapJerarquiaDbError(error);
    if (!inserted?.id) return { code: "INTERNAL" as const };

    revalidatePath(INVENTARIO_PATH);
    return { success: true as const, id: inserted.id as string };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function listarLaboratoriosPorProveedor(proveedorId: string) {
  try {
    const auth = await requireLecturaInventario();
    if (!auth.ok) return { code: auth.code };

    const { data, error } = await auth.supabase
      .from("inv_laboratorios")
      .select(LABORATORIO_SELECT)
      .eq("proveedor_id", proveedorId)
      .order("nombre", { ascending: true });

    if (error) return { code: "INTERNAL" as const };

    const items: InvLaboratorio[] = [];
    for (const row of data ?? []) {
      const item = mapFilaLaboratorio(row as Record<string, unknown>);
      if (item) items.push(item);
    }
    return { success: true as const, data: items };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function desligarLaboratorioDeProveedor(
  laboratorioId: string,
  proveedorId: string,
) {
  try {
    const guard = await requireRole([...COMERCIAL_WRITE_ROLES]);
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const { data: row, error: fetchErr } = await supabase
      .from("inv_laboratorios")
      .select("id, proveedor_id")
      .eq("id", laboratorioId)
      .maybeSingle();

    if (fetchErr || !row) return { code: "NOT_FOUND" as const };
    if (row.proveedor_id !== proveedorId) return { code: "VALIDATION" as const };

    const { error } = await supabase
      .from("inv_laboratorios")
      .update({ proveedor_id: null })
      .eq("id", laboratorioId);

    if (error) return mapJerarquiaDbError(error);
    revalidatePath(INVENTARIO_PATH);
    revalidatePath(PROVEEDORES_PATH);
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function crearProveedorYLaboratorio(input: CrearProveedorYLaboratorioInput) {
  try {
    const guard = await requireRole([...COMERCIAL_WRITE_ROLES]);
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const parsed = crearProveedorYLaboratorioInputSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const provPayload = {
      nombre: parsed.data.proveedor.nombre,
      descripcion: parsed.data.proveedor.descripcion || null,
      nit: parsed.data.proveedor.nit || null,
      telefono: parsed.data.proveedor.telefono || null,
      correo: parsed.data.proveedor.correo || null,
    };

    const { data: provInserted, error: provErr } = await supabase
      .from("inv_proveedores")
      .insert(provPayload)
      .select("id")
      .single();

    if (provErr || !provInserted?.id) return { code: "INTERNAL" as const };
    const proveedorId = provInserted.id as string;

    const nombreLab = parsed.data.laboratorio.nombre.trim();
    const needle = normalizarTextoBusquedaProducto(nombreLab);
    const { data: existentes } = await supabase.from("inv_laboratorios").select("id, nombre");
    for (const row of existentes ?? []) {
      if (normalizarTextoBusquedaProducto(String(row.nombre)) === needle) {
        await supabase.from("inv_proveedores").delete().eq("id", proveedorId);
        return { code: "DUPLICATE" as const, detail: DUPLICATE_LABORATORIO_MSG };
      }
    }

    const { data: labInserted, error: labErr } = await supabase
      .from("inv_laboratorios")
      .insert({
        nombre: nombreLab,
        activo: parsed.data.laboratorio.activo ?? true,
        proveedor_id: proveedorId,
      })
      .select("id")
      .single();

    if (labErr || !labInserted?.id) {
      await supabase.from("inv_proveedores").delete().eq("id", proveedorId);
      return mapJerarquiaDbError(labErr ?? { code: "INTERNAL" });
    }

    revalidatePath(INVENTARIO_PATH);
    revalidatePath(PROVEEDORES_PATH);
    return {
      success: true as const,
      proveedor_id: proveedorId,
      laboratorio_id: labInserted.id as string,
    };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function guardarLaboratorio(id: string | undefined, input: LaboratorioInput) {
  try {
    const guard = await requireRole([...COMERCIAL_WRITE_ROLES]);
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const parsed = id
      ? laboratorioUpdateInputSchema.safeParse(input)
      : laboratorioCreateInputSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const nombre = parsed.data.nombre.trim();
    const needle = normalizarTextoBusquedaProducto(nombre);
    const { data: existentes } = await supabase.from("inv_laboratorios").select("id, nombre");
    for (const row of existentes ?? []) {
      if (id && row.id === id) continue;
      if (normalizarTextoBusquedaProducto(String(row.nombre)) === needle) {
        return { code: "DUPLICATE" as const, detail: DUPLICATE_LABORATORIO_MSG };
      }
    }

    const payload: { nombre: string; activo: boolean; proveedor_id?: string | null } = {
      nombre,
      activo: parsed.data.activo,
    };
    if (!id) {
      payload.proveedor_id = parsed.data.proveedor_id ?? null;
    } else if (parsed.data.proveedor_id !== undefined) {
      payload.proveedor_id = parsed.data.proveedor_id;
    }

    if (id) {
      const { error } = await supabase.from("inv_laboratorios").update(payload).eq("id", id);
      if (error) return mapJerarquiaDbError(error);
      revalidatePath(INVENTARIO_PATH);
      revalidatePath(PROVEEDORES_PATH);
      return { success: true as const, id };
    }

    const { data: inserted, error } = await supabase
      .from("inv_laboratorios")
      .insert(payload)
      .select("id")
      .single();

    if (error) return mapJerarquiaDbError(error);
    if (!inserted?.id) return { code: "INTERNAL" as const };

    revalidatePath(INVENTARIO_PATH);
    revalidatePath(PROVEEDORES_PATH);
    return { success: true as const, id: inserted.id as string };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function asignarLaboratorioComercial(
  productoId: string,
  laboratorioId: string | null,
) {
  try {
    const guard = await requireRole([...COMERCIAL_WRITE_ROLES]);
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    if (!productoId) return { code: "VALIDATION" as const };

    if (laboratorioId) {
      const { data: lab, error: labErr } = await supabase
        .from("inv_laboratorios")
        .select("id")
        .eq("id", laboratorioId)
        .maybeSingle();
      if (labErr || !lab) {
        return { code: "VALIDATION" as const, detail: "Laboratorio no encontrado." };
      }
    }

    const { error } = await supabase
      .from("inv_productos")
      .update({ laboratorio_id: laboratorioId })
      .eq("id", productoId);

    if (error) return mapJerarquiaDbError(error);
    revalidatePath(INVENTARIO_PATH);
    revalidatePath(PROVEEDORES_PATH);
    return { success: true as const };
  } catch {
    return { code: "INTERNAL" as const };
  }
}

export async function guardarComercial(id: string | undefined, input: ComercialInput) {
  try {
    const guard = await requireRole([...COMERCIAL_WRITE_ROLES]);
    if (!guard.ok) return { code: guard.code };
    const { supabase } = guard;

    const parsed = comercialInputSchema.safeParse(input);
    if (!parsed.success) return { code: "VALIDATION" as const };

    const laboratorioId = parsed.data.laboratorio_id ?? null;
    const claveNueva = claveComercialUnica({
      generico_id: parsed.data.generico_id,
      laboratorio_id: laboratorioId,
      nombre_comercial: parsed.data.nombre_comercial,
      presentacion: parsed.data.presentacion,
    });
    const { data: delMismoGenerico } = await supabase
      .from("inv_productos")
      .select("id, generico_id, laboratorio_id, nombre, presentacion")
      .eq("generico_id", parsed.data.generico_id);

    for (const row of delMismoGenerico ?? []) {
      if (id && row.id === id) continue;
      if (
        claveComercialUnica({
          generico_id: String(row.generico_id),
          laboratorio_id: row.laboratorio_id as string | null,
          nombre_comercial: String(row.nombre),
          presentacion: String(row.presentacion),
        }) === claveNueva
      ) {
        return { code: "DUPLICATE" as const, detail: DUPLICATE_COMERCIAL_MSG };
      }
    }

    const payload = {
      generico_id: parsed.data.generico_id,
      laboratorio_id: laboratorioId,
      nombre: parsed.data.nombre_comercial.trim(),
      presentacion: parsed.data.presentacion.trim(),
      precio_base: parsed.data.precio_venta,
      activo: parsed.data.activo,
      descripcion: parsed.data.descripcion?.trim() || null,
      imagen_url: parsed.data.imagen_url ?? null,
    };

    if (id) {
      const { error } = await supabase.from("inv_productos").update(payload).eq("id", id);
      if (error) return mapJerarquiaDbError(error);
      revalidatePath(INVENTARIO_PATH);
      return { success: true as const, id };
    }

    const { data: inserted, error } = await supabase
      .from("inv_productos")
      .insert({
        ...payload,
        stock_actual: 0,
      })
      .select("id")
      .single();

    if (error) return mapJerarquiaDbError(error);
    if (!inserted?.id) return { code: "INTERNAL" as const };

    revalidatePath(INVENTARIO_PATH);
    revalidatePath("/farmamuni/proveedores");
    return { success: true as const, id: inserted.id as string };
  } catch {
    return { code: "INTERNAL" as const };
  }
}
