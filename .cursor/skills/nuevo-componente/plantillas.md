# Plantillas

Sustituye `Entidad` / `entidad` / `entidades` por el nombre real del módulo y su tabla.

## 0. Fechas y hora (Guatemala)

### SQL de tabla nueva

```sql
create table if not exists public.entidades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  fecha_evento date not null default current_date,
  periodo timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create or replace function public.entidades_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entidades_set_updated_at
  before update on public.entidades
  for each row execute function public.entidades_set_updated_at();
```

### Schemas Zod con fechas

```typescript
import { z } from "zod";

export const fechaCalendarioSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const mesCalendarioSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, "Mes inválido");

export const entidadFormSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  fecha_evento: fechaCalendarioSchema,
  periodo: mesCalendarioSchema,
});
```

### Guardar y leer en actions

```typescript
import {
  mesCalendarioToTimestamptz,
  normalizarFechaCalendario,
  normalizarMesCalendario,
} from "@/lib/fechas-gt";

// insert — date tal cual, timestamptz de mes con helper
await supabase.from("entidades").insert({
  nombre: parsed.data.nombre,
  fecha_evento: normalizarFechaCalendario(parsed.data.fecha_evento),
  periodo: mesCalendarioToTimestamptz(parsed.data.periodo),
});

// normalizar fila desde Supabase
function normalizarEntidad(row: Record<string, unknown>): EntidadRecord {
  return {
    id: String(row.id),
    nombre: String(row.nombre ?? ""),
    fecha_evento: normalizarFechaCalendario(String(row.fecha_evento ?? "")),
    periodo: row.periodo ? String(row.periodo) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}
```

### Input de fecha en formulario

```tsx
import {
  fechaCalendarioGt,
  formatFechaCalendarioGt,
  formatFechaHoraGt,
  mesCalendarioGt,
  normalizarFechaCalendario,
  timestamptzToMesCalendario,
} from "@/lib/fechas-gt";

// estado inicial al crear
const [fechaEvento, setFechaEvento] = useState(fechaCalendarioGt);
const [periodo, setPeriodo] = useState(mesCalendarioGt);

// estado inicial al editar
setFechaEvento(normalizarFechaCalendario(registro.fecha_evento));
setPeriodo(timestamptzToMesCalendario(registro.periodo));

// JSX
<input type="date" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} />
<input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />

// mostrar en listado
<span>{formatFechaCalendarioGt(entidad.fecha_evento)}</span>
<span>{formatFechaHoraGt(entidad.created_at)}</span>
```

## 1. `lib/zod.ts`

```typescript
import { z } from "zod";

export const entidadFormSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  descripcion: z.string().trim().max(500).optional().default(""),
  activo: z.boolean().default(true),
});

export type EntidadFormValues = z.infer<typeof entidadFormSchema>;

export type EntidadRecord = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fecha_evento: string;
  periodo: string | null;
  created_at: string;
  updated_at: string | null;
};
```

Los tipos de fila (`EntidadRecord`) se declaran a mano porque describen lo que devuelve Supabase, no lo que valida el formulario. Todo lo que venga de un formulario sale de `z.infer`.

## 2. `lib/actions.ts`

```typescript
"use server";

import { createClient } from "@/utils/supabase/server";
import { entidadFormSchema, type EntidadFormValues, type EntidadRecord } from "./zod";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ActionResult = { success: boolean; error: string | null };

async function requireSession(): Promise<
  { supabase: SupabaseServerClient; error: null } | { supabase: null; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase: null, error: "UNAUTHORIZED" };

  return { supabase, error: null };
}

function normalizarEntidad(row: Record<string, unknown>): EntidadRecord {
  return {
    id: String(row.id),
    nombre: String(row.nombre ?? ""),
    descripcion: (row.descripcion as string | null) ?? null,
    activo: row.activo !== false,
    created_at: String(row.created_at ?? ""),
  };
}

export async function getEntidades(): Promise<EntidadRecord[]> {
  const { supabase, error } = await requireSession();
  if (error) return [];

  try {
    const { data, error: dbError } = await supabase
      .from("entidades")
      .select("id, nombre, descripcion, activo, created_at")
      .order("nombre");

    if (dbError) return [];

    return (data ?? []).map(normalizarEntidad);
  } catch {
    return [];
  }
}

export async function createEntidad(values: EntidadFormValues): Promise<ActionResult> {
  const { supabase, error } = await requireSession();
  if (error) return { success: false, error };

  const parsed = entidadFormSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: "INVALID_INPUT" };

  try {
    const { error: dbError } = await supabase.from("entidades").insert(parsed.data);
    if (dbError) return { success: false, error: "DB_ERROR" };

    return { success: true, error: null };
  } catch {
    return { success: false, error: "DB_ERROR" };
  }
}

export async function updateEntidad(
  id: string,
  values: EntidadFormValues,
): Promise<ActionResult> {
  const { supabase, error } = await requireSession();
  if (error) return { success: false, error };

  const parsed = entidadFormSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: "INVALID_INPUT" };

  try {
    const { error: dbError } = await supabase
      .from("entidades")
      .update(parsed.data)
      .eq("id", id);

    if (dbError) return { success: false, error: "SAVE_FAILED" };

    return { success: true, error: null };
  } catch {
    return { success: false, error: "SAVE_FAILED" };
  }
}

export async function deleteEntidad(id: string): Promise<ActionResult> {
  const { supabase, error } = await requireSession();
  if (error) return { success: false, error };

  try {
    const { error: dbError } = await supabase.from("entidades").delete().eq("id", id);
    if (dbError) return { success: false, error: "DELETE_FAILED" };

    return { success: true, error: null };
  } catch {
    return { success: false, error: "DELETE_FAILED" };
  }
}
```

Si el módulo requiere rol, reemplaza `requireSession` por una variante que además valide el rol, como hace `requireAdmin` en `src/components/organizacion-jerarquica/lib/actions.ts` con `isSuperOrAdminRole`.

## 3. `lib/hooks.ts`

```typescript
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEntidad, deleteEntidad, getEntidades, updateEntidad } from "./actions";
import type { EntidadFormValues } from "./zod";

const ENTIDADES_KEY = ["entidades"];

export function useEntidades() {
  return useQuery({
    queryKey: ENTIDADES_KEY,
    queryFn: getEntidades,
  });
}

function useInvalidateEntidades() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ENTIDADES_KEY });
}

export function useCrearEntidad() {
  const invalidate = useInvalidateEntidades();
  return useMutation({
    mutationFn: (values: EntidadFormValues) => createEntidad(values),
    onSuccess: invalidate,
  });
}

export function useEditarEntidad() {
  const invalidate = useInvalidateEntidades();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: EntidadFormValues }) =>
      updateEntidad(id, values),
    onSuccess: invalidate,
  });
}

export function useEliminarEntidad() {
  const invalidate = useInvalidateEntidades();
  return useMutation({
    mutationFn: (id: string) => deleteEntidad(id),
    onSuccess: invalidate,
  });
}
```

## 4. `lib/helpers.ts` (opcional)

Solo si hay funciones puras reutilizadas en 2+ archivos del módulo. **Tipos y schemas van en `zod.ts`**, no aquí.

Referencia: `src/components/(SIGET)/memoria-labores/lib/helpers.ts`.

```typescript
import type { EntidadRecord, EntidadFormValues } from "./zod";

export function emptyEntidadForm(): EntidadFormValues {
  return {
    nombre: "",
    fecha_evento: "",
    periodo: "",
  };
}

export function normalizarEntidad(row: Record<string, unknown>): EntidadRecord {
  return {
    id: String(row.id),
    nombre: String(row.nombre ?? ""),
    fecha_evento: String(row.fecha_evento ?? ""),
    periodo: row.periodo ? String(row.periodo) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

export function etiquetaEntidad(entidad: EntidadRecord): string {
  return entidad.nombre.trim() || "Sin nombre";
}
```

**Qué va en helpers:** normalización de filas Supabase, factories `empty*()`, filtros locales, formateo de etiquetas, ordenamiento.

**Qué no va en helpers:** tipos, schemas Zod, Server Actions, hooks, confirmaciones SweetAlert (`lib/swal.ts` o `@/lib/confirm-destructivo`).

Archivos especializados (`*-excel.ts`, `*-export.ts`) pueden coexistir; no reemplazan `helpers.ts`.

## 5. `forms/Crear.tsx`

```tsx
"use client";

import { useState } from "react";
import { fechaCalendarioGt } from "@/lib/fechas-gt";
import {
  ModalShell,
  ModalLabel,
  ModalInput,
  ModalTextarea,
  ModalForm,
  ModalField,
  ModalSubmit,
  ModalFooter,
  ModalCancelButton,
  modalActionMessage,
  toast,
} from "@/components/ui/general-modal";
import { useCrearEntidad } from "../lib/hooks";
import { entidadFormSchema } from "../lib/zod";

function CrearBody({ onClose }: { onClose: () => void }) {
  const crear = useCrearEntidad();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = entidadFormSchema.safeParse({ nombre, descripcion, activo: true });
    if (!parsed.success) {
      toast.warn("Revisa los datos del formulario.");
      return;
    }

    const res = await crear.mutateAsync(parsed.data);
    if (res.success) {
      toast.success("Registro creado.");
      onClose();
      return;
    }

    toast.error(modalActionMessage(res.error ?? undefined, "No se pudo guardar."));
  };

  return (
    <ModalForm onSubmit={handleSubmit}>
      <ModalField>
        <ModalLabel htmlFor="nombre">Nombre</ModalLabel>
        <ModalInput
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          autoFocus
        />
      </ModalField>

      <ModalField>
        <ModalLabel htmlFor="descripcion">Descripción (opcional)</ModalLabel>
        <ModalTextarea
          id="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
        />
      </ModalField>

      <ModalFooter>
        <ModalCancelButton onClick={onClose} disabled={crear.isPending} />
        <ModalSubmit disabled={crear.isPending} />
      </ModalFooter>
    </ModalForm>
  );
}

export function CrearEntidad({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const onClose = () => onOpenChange(false);

  return (
    <ModalShell open={open} onClose={onClose} title="Nuevo registro" maxWidth="max-w-lg">
      {open && <CrearBody onClose={onClose} />}
    </ModalShell>
  );
}
```

El `{open && <Body />}` es importante: monta el cuerpo desde cero en cada apertura y evita arrastrar estado del formulario anterior.

## 6. `forms/VerEditar.tsx`

Misma estructura que `Crear.tsx`, con tres diferencias:

- Recibe el `EntidadRecord` y arranca el estado con sus valores.
- Usa `useEditarEntidad` y pasa `{ id, values }`.
- Si permite eliminar, usa `ModalConfirmDelete` dentro del modal:

```tsx
const [confirmando, setConfirmando] = useState(false);
const eliminar = useEliminarEntidad();

{confirmando && (
  <ModalConfirmDelete
    message="¿Eliminar este registro? Esta acción no se puede deshacer."
    pending={eliminar.isPending}
    onCancel={() => setConfirmando(false)}
    onConfirm={async () => {
      const res = await eliminar.mutateAsync(registro.id);
      if (res.success) {
        toast.success("Registro eliminado.");
        onClose();
        return;
      }
      toast.error(modalActionMessage(res.error ?? undefined, "No se pudo eliminar."));
    }}
  />
)}
```

## 7. `NombreRepresentativo.tsx`

```tsx
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useEntidades } from "./lib/hooks";
import { CrearEntidad } from "./forms/Crear";
import type { EntidadRecord } from "./lib/zod";

export function ListadoEntidades() {
  const { data: entidades = [], isLoading } = useEntidades();
  const [crearAbierto, setCrearAbierto] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">Entidades</h2>
        <button
          type="button"
          onClick={() => setCrearAbierto(true)}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-azul-trifinio px-6 text-white transition-opacity hover:opacity-90 active:scale-95"
        >
          Crear
        </button>
      </div>

      {isLoading ? (
        <EntidadesSkeleton />
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          {entidades.map((entidad: EntidadRecord) => (
            <motion.div
              key={entidad.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800"
            >
              {entidad.nombre}
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      <CrearEntidad open={crearAbierto} onOpenChange={setCrearAbierto} />
    </section>
  );
}
```

## 8. `app/siget/[ruta]/page.tsx`

```tsx
import { Suspense } from "react";
import { ListadoEntidades } from "@/components/entidades/ListadoEntidades";

export default function Page() {
  return (
    <Suspense>
      <ListadoEntidades />
    </Suspense>
  );
}
```

Si la ruta debe restringirse por rol, la validación va en `src/proxy.ts`, junto a las demás reglas de `/siget`, no en `page.tsx`.
