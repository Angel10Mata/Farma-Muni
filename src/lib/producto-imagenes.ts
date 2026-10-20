import { createClient } from "@/utils/supabase/client";

export const PRODUCTO_IMAGENES_BUCKET =
  process.env.NEXT_PUBLIC_PRODUCTO_IMAGENES_BUCKET?.trim() || "farmamuni";

export const LEGACY_PRODUCTO_IMAGENES_BUCKET = "Imagenes_Farmacia";

export const MARCA_IMAGENES_MAX_TOTAL_BYTES = 200 * 1024;

export const MARCA_IMAGENES_SLOTS = 3;

export function productoImagenPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const supabase = createClient();
  return supabase.storage.from(PRODUCTO_IMAGENES_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function productoImagenPublicUrlLegacy(path: string | null | undefined): string | null {
  if (!path) return null;
  const supabase = createClient();
  return supabase.storage.from(LEGACY_PRODUCTO_IMAGENES_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function productoImagenDisplayUrl(path: string | null | undefined): string | null {
  return productoImagenPublicUrl(path) ?? productoImagenPublicUrlLegacy(path);
}

export function pathsMarcaImagenes(producto: {
  imagen_url?: string | null;
  imagen_url_2?: string | null;
  imagen_url_3?: string | null;
}): [string | null, string | null, string | null] {
  return [producto.imagen_url ?? null, producto.imagen_url_2 ?? null, producto.imagen_url_3 ?? null];
}

export async function fetchStorageObjectBytes(
  bucket: string,
  path: string,
): Promise<number | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return data.size;
}

export async function resolveMarcaSlotBytes(
  paths: [string | null, string | null, string | null],
): Promise<[number, number, number]> {
  const buckets = [PRODUCTO_IMAGENES_BUCKET, LEGACY_PRODUCTO_IMAGENES_BUCKET];
  const sizes: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < MARCA_IMAGENES_SLOTS; i++) {
    const path = paths[i];
    if (!path) continue;
    let bytes: number | null = null;
    for (const bucket of buckets) {
      bytes = await fetchStorageObjectBytes(bucket, path);
      if (bytes != null) break;
    }
    sizes[i] = bytes ?? 0;
  }
  return sizes;
}
