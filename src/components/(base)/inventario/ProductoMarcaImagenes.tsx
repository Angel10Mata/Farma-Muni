"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import { toast } from "react-toastify";
import ImageUploader from "@/components/imgs/ImageUploader";
import { ImagenAmpliadaOverlay } from "@/components/imgs/ImagenAmpliadaOverlay";
import { cn } from "@/lib/utils";
import {
  MARCA_IMAGENES_MAX_TOTAL_BYTES,
  MARCA_IMAGENES_SLOTS,
  PRODUCTO_IMAGENES_BUCKET,
  pathsMarcaImagenes,
  productoImagenDisplayUrl,
  resolveMarcaSlotBytes,
} from "@/lib/producto-imagenes";
import { useActualizarImagenesMarcaInventario } from "./lib/hooks";

export type MarcaImagenesPaths = {
  imagen_url: string | null;
  imagen_url_2: string | null;
  imagen_url_3: string | null;
};

type MarcaPaths = MarcaImagenesPaths;

const SLOT_KEYS: (keyof MarcaPaths)[] = ["imagen_url", "imagen_url_2", "imagen_url_3"];

function pathsFromProducto(producto: {
  imagen_url?: string | null;
  imagen_url_2?: string | null;
  imagen_url_3?: string | null;
}): MarcaPaths {
  const [a, b, c] = pathsMarcaImagenes(producto);
  return { imagen_url: a, imagen_url_2: b, imagen_url_3: c };
}

export function ProductoMarcaImagenes({
  productoId,
  producto,
  editable,
  onPathsUpdated,
  layout = "detalle",
}: {
  productoId?: string;
  producto: {
    imagen_url?: string | null;
    imagen_url_2?: string | null;
    imagen_url_3?: string | null;
  };
  editable: boolean;
  onPathsUpdated?: (paths: MarcaPaths) => void;
  layout?: "detalle" | "modal";
}) {
  const [paths, setPaths] = useState<MarcaPaths>(() => pathsFromProducto(producto));
  const [slotBytes, setSlotBytes] = useState<[number, number, number]>([0, 0, 0]);
  const [imagenAmpliadaUrl, setImagenAmpliadaUrl] = useState<string | null>(null);

  const { mutateAsync: guardarImagenes, isPending } = useActualizarImagenesMarcaInventario();

  useEffect(() => {
    setPaths(pathsFromProducto(producto));
  }, [producto.imagen_url, producto.imagen_url_2, producto.imagen_url_3]);

  useEffect(() => {
    let cancelled = false;
    const tuple = pathsMarcaImagenes(paths);
    if (!tuple.some(Boolean)) {
      setSlotBytes([0, 0, 0]);
      return;
    }
    resolveMarcaSlotBytes(tuple).then((sizes) => {
      if (!cancelled) {
        setSlotBytes(sizes);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [paths.imagen_url, paths.imagen_url_2, paths.imagen_url_3]);

  const totalBytes = useMemo(
    () => slotBytes[0] + slotBytes[1] + slotBytes[2],
    [slotBytes],
  );

  const persist = useCallback(
    async (next: MarcaPaths) => {
      setPaths(next);
      onPathsUpdated?.(next);
      if (!productoId) return;
      await guardarImagenes({
        productoId,
        data: next,
      });
    },
    [guardarImagenes, onPathsUpdated, productoId],
  );

  const budgetForSlot = (index: number) =>
    MARCA_IMAGENES_MAX_TOTAL_BYTES - totalBytes + slotBytes[index];

  const labelClass =
    "text-etiqueta font-black uppercase tracking-widest text-[#525D53] dark:text-look-1-salvia-suave/70";

  if (!editable) {
    return (
      <div className="space-y-3">
        <h4 className={labelClass}>Galería</h4>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          {SLOT_KEYS.map((key, idx) => {
            const publicUrl = productoImagenDisplayUrl(paths[key]);
            return (
              <div
                key={key}
                className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl border border-[#C1D1C5]/35 bg-white dark:border-[#A3BEB0]/20 dark:bg-zinc-900/60 lg:aspect-[5/4]"
              >
                {publicUrl ? (
                  <button
                    type="button"
                    onClick={() => setImagenAmpliadaUrl(publicUrl)}
                    className="size-full cursor-zoom-in border-0 bg-transparent p-0"
                    aria-label={`Ampliar imagen ${idx + 1}`}
                  >
                    <img
                      src={publicUrl}
                      alt={`Imagen ${idx + 1}`}
                      className="size-full object-cover"
                    />
                  </button>
                ) : (
                  <Package className="size-6 text-slate-300" />
                )}
              </div>
            );
          })}
        </div>
        <ImagenAmpliadaOverlay
          imageUrl={imagenAmpliadaUrl}
          onClose={() => setImagenAmpliadaUrl(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className={labelClass}>Imágenes de marca</h4>
        <p className="mt-1 text-xs text-texto-tenue">
          Opcional · hasta {MARCA_IMAGENES_SLOTS} fotos · máximo 200 KB en total
        </p>
      </div>
      <div
        className={cn(
          "grid gap-2",
          layout === "modal" ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-3 lg:grid-cols-1",
        )}
      >
        {SLOT_KEYS.map((key, index) => {
          const currentPath = paths[key];
          const maxBytes = budgetForSlot(index);
          const disabled =
            (productoId ? isPending : false) || (!currentPath && maxBytes < 1024);
          return (
            <div
              key={key}
              className="overflow-hidden rounded-xl border border-[#C1D1C5]/35 bg-white dark:border-[#A3BEB0]/20 dark:bg-zinc-900/60 w-full"
            >
              <ImageUploader
                bucketName={PRODUCTO_IMAGENES_BUCKET}
                currentImagePath={currentPath}
                permitirTodos
                variant="product"
                aspect={4 / 5}
                aspectLabel="Vertical 4:5"
                disabled={disabled}
                maxCompressedBytes={maxBytes}
                onUploadedBytes={(bytes) => {
                  setSlotBytes((prev) => {
                    const copy = [...prev] as [number, number, number];
                    copy[index] = bytes;
                    return copy;
                  });
                }}
                onUploadSuccess={async (newPath) => {
                  const keyName = SLOT_KEYS[index];
                  try {
                    await persist({ ...paths, [keyName]: newPath });
                  } catch (err) {
                    const message = err instanceof Error ? err.message : undefined;
                    toast.error(message ?? "No se pudieron guardar las imágenes.");
                  }
                }}
                onDeleteSuccess={async () => {
                  const keyName = SLOT_KEYS[index];
                  setSlotBytes((prev) => {
                    const copy = [...prev] as [number, number, number];
                    copy[index] = 0;
                    return copy;
                  });
                  try {
                    await persist({ ...paths, [keyName]: null });
                  } catch (err) {
                    const message = err instanceof Error ? err.message : undefined;
                    toast.error(message ?? "No se pudieron guardar las imágenes.");
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
