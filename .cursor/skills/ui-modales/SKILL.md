---
name: ui-modales
description: Implementa formularios y ventanas flotantes con ModalShell de general-modal.tsx — ModalInput, ModalFooter, ModalConfirmDelete, modales wizard multi-paso (GvModalShell) y feedback con toast. Se usa al crear o editar modales, formularios en overlay o confirmaciones destructivas dentro de un modal.
---

# Modales

Implementación única: `@/components/ui/general-modal.tsx`.

Componentes: `ModalShell`, `ModalForm`, `ModalField`, `ModalLabel`, `ModalInput`, `ModalTextarea`, `ModalFechaInput`, `ModalCancelButton`, `ModalSubmit`, `ModalFooter`, `ModalConfirmDelete`, `modalFieldClass`, `modalAccentClass`.

## Formato visual

### Superficies

| Zona | Claro | Oscuro |
|------|-------|--------|
| Marco (`ModalFrame`) | `zinc-100` | `zinc-800` |
| Header + contenido | `white` (mismo fondo → título y labels se ven igual) | `zinc-900` |
| Footer | `zinc-100` + `border-t` | `zinc-800` + `border-t` |
| Separador header | `border-b zinc-200/80` | `border-b zinc-700` |

### Tipografía

- **Título:** solo el `title` de `ModalShell` (sin `subtitle` salvo caso excepcional).
- **Título y labels:** `modalAccentClass` → `font-bold text-[#2c5f9b] dark:text-[#6f9fd4]`.
- **Espaciado label → input:** `ModalField` con `space-y-2.5`.
- **Espaciado entre campos:** `ModalForm` con `space-y-4`.

### Campos

- Inputs y textareas: borde zinc (`modalFieldClass`), fondo transparente, focus ring zinc.
- Fechas de calendario: **solo** `ModalFechaInput` (`DD/MM/AAAA`, manual, sin icono ni popover). Valor ISO `YYYY-MM-DD` vía `fechas-gt.ts`.
- Prohibido `CalendarDatePicker`, `<input type="date">` y placeholders genéricos (excepto `DD/MM/AAAA` en fecha).

### Footer

- `ModalFooter` + `ModalCancelButton` + `ModalSubmit` (SigetActionButton, skill `ui-tema-botones`).
- Botones compactos (`w-auto`), centrados; padding vertical reducido.

## Comportamiento

- Portal al `body` con `createPortal`; `z-[200]`; bloquear scroll del body.
- **Escritorio:** centrado, overlay oscuro con blur, `rounded-3xl`, sombra ligera.
- **Teléfono:** pantalla completa `100dvh`, fondo zinc sólido, safe area arriba/abajo.
- Cerrar con X celeste en header.

## Prohibido

- `Dialog` de shadcn u otros modales ad hoc para formularios.
- SweetAlert dentro de `ModalShell` (usar `ModalConfirmDelete`).
- Botones de acción que no sean `SigetActionButton` / `ModalCancelButton` / `ModalSubmit`.

## Plantilla

```tsx
"use client";

import { useState } from "react";
import { fechaCalendarioGt } from "@/lib/fechas-gt";
import {
  ModalShell,
  ModalLabel,
  ModalInput,
  ModalFechaInput,
  ModalForm,
  ModalField,
  ModalFooter,
  ModalCancelButton,
  ModalSubmit,
  modalActionMessage,
  toast,
} from "@/components/ui/general-modal";

export function EjemploModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const onClose = () => onOpenChange(false);
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(fechaCalendarioGt);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !fecha) {
      toast.warn("Revisa los datos del formulario.");
      return;
    }
    setPending(true);
    // const res = await mutacion...
    setPending(false);
    toast.success("Guardado correctamente.");
    onClose();
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Título" maxWidth="max-w-lg">
      {open && (
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
            <ModalLabel htmlFor="fecha">Fecha</ModalLabel>
            <ModalFechaInput
              id="fecha"
              value={fecha}
              onChange={setFecha}
              required
            />
          </ModalField>
          <ModalFooter>
            <ModalCancelButton onClick={onClose} disabled={pending} />
            <ModalSubmit disabled={pending} />
          </ModalFooter>
        </ModalForm>
      )}
    </ModalShell>
  );
}
```

Montar el cuerpo con `{open && <Body />}` para resetear estado en cada apertura.

## Modal wizard (multi-paso)

Formularios largos en **varios pasos** dentro del mismo overlay: barra de progreso arriba, un solo `react-hook-form`, validación **por paso** con Zod y footer **Cancelar/Atrás** + **Siguiente/Enviar**.

**Referencia de producción:** `gestion-vehiculos/solicitudes/forms/Crear.tsx` (Nueva Solicitud de Vehículo).

### Cuándo usarlo

- Dos o más bloques lógicos (ej. datos de solicitud → misión).
- El modal debe **mantener altura** al cambiar de paso (contenido pesado en paso 1, p. ej. calendario).
- Datos del paso anterior deben conservarse al volver con **Atrás** (sin remontar queries).

### Shell (gestión territorial / vehículos)

No usar `ModalForm` plano; usar el envoltorio GV sobre `ModalShell`:

| Pieza | Import |
|-------|--------|
| Marco | `GvModalShell` (`fullHeight` por defecto, `maxWidth="max-w-lg"`) |
| Formulario | `GvModalForm` |
| Cuerpo scroll | `GvModalFormBody` |
| Footer | `GvModalFooter` con `className="flex flex-wrap items-center justify-center gap-2"` |

Desde: `@/components/(SIGET)/gestion-territorial/gestion-vehiculos/lib/gv-modal-shell` (o ruta relativa `../../lib/gv-modal-shell` dentro del módulo).

Selects en wizard: `GV_MODAL_SELECT_TRIGGER_CLASS`, `GV_MODAL_SELECT_CONTENT_CLASS`, `GV_MODAL_SELECT_ITEM_CLASS` (`z-[250]`, fondo opaco).

Botones de acción: **solo** `SigetActionButton` (skill `ui-tema-botones`), no `ModalSubmit` en el footer del wizard.

### Estado y reset

```tsx
const WIZARD_PASOS = 2; // o export const en lib/zod.ts del módulo
const WIZARD_PASOS_META = [{ titulo: "Paso A" }, { titulo: "Paso B" }] as const;
const WIZARD_CONTENIDO_MIN_H = "min-h-[34rem]"; // evita que el modal encoja entre pasos

const [wizardStep, setWizardStep] = useState(1);

useEffect(() => {
  if (open) {
    setWizardStep(1);
    reset(defaultValues); // react-hook-form
  }
}, [open, reset, /* deps de default */]);
```

Montar con `{open ? <GvModalForm>...</GvModalForm> : null}` dentro de `GvModalShell`.

### Zod por paso

En `lib/zod.ts` del módulo:

- Schema **completo** para envío final (`solicitudInputSchema` / equivalente).
- `solicitudWizardPaso1Schema`, `solicitudWizardPaso2Schema`, … solo campos del paso.
- Constante `SOLICITUD_WIZARD_PASOS` (o `WIZARD_PASOS`).

Validar con `.safeParse()` en handlers, **no** confiar solo en `handleSubmit` hasta el último paso.

Helper para mapear errores Zod a `setError` (solo paths del paso):

```tsx
function aplicarErroresZod(
  error: ZodError,
  setError: (name: keyof FormInput, err: { message: string }) => void,
  clearErrors: (names?: (keyof FormInput)[]) => void,
  fields: (keyof FormInput)[],
) {
  clearErrors(fields);
  for (const issue of error.issues) {
    const path = issue.path[0];
    if (typeof path === "string" && fields.includes(path as keyof FormInput)) {
      setError(path as keyof FormInput, { message: issue.message });
    }
  }
}
```

En fallo de paso: `toast.warn("…")` con mensaje corto; errores inline solo en campos del paso (evitar mensajes bajo widgets que se autocompletan, p. ej. calendario).

### Barra de progreso

Debajo del header, dentro de `GvModalFormBody`:

- Fila `flex gap-1.5`; un segmento por paso (`flex-1`).
- Barra `h-1 rounded-full`: activo o completado → `bg-[#2c5f9b] dark:bg-[#6f9fd4]`; pendiente → `bg-zinc-200 dark:bg-zinc-700`.
- Etiqueta `text-[10px] font-semibold`: paso activo → `modalAccentClass`; resto → `text-muted-foreground`.
- Sin subtítulo “Paso X de Y” salvo que el producto lo pida.

### Pasos en DOM (no desmontar)

**No** usar `AnimatePresence` con `key={wizardStep}` si el paso 1 tiene queries TanStack o estado interno pesado.

Envolver cada paso en un `div` con `hidden` / `aria-hidden`:

```tsx
<div className={cn("space-y-3", WIZARD_CONTENIDO_MIN_H)}>
  <div className={cn("space-y-3", wizardStep !== 1 && "hidden")} aria-hidden={wizardStep !== 1}>
    {/* paso 1 */}
  </div>
  <div className={cn("space-y-3", wizardStep !== 2 && "hidden")} aria-hidden={wizardStep !== 2}>
    {/* paso 2 */}
  </div>
</div>
```

Mantener `useQuery(..., { enabled: open && … })` **sin** atar `enabled` al número de paso si los datos deben seguir en caché al ir a paso 2 y volver.

### Submit del formulario

Un solo `<GvModalForm onSubmit={…}>`. En `preventDefault`:

- Si `wizardStep < WIZARD_PASOS` → `handleSiguiente()` (valida paso actual, `setWizardStep(n+1)`).
- Si último paso → `handleEnviarClick()` (valida paso final y luego `handleSubmit(onSubmit)`).

`handleSiguiente` / `handleEnviarClick` usan `getValues()`, no envían al servidor hasta el envío final.

### Footer

| Paso | Izquierda | Derecha (`type="submit"`) |
|------|-----------|---------------------------|
| 1 | `SigetActionButton` Cancelar (`sigetAccent.cancelar`, icono `X`) | Siguiente (`sigetAccent.crear`, `ChevronRight`) |
| 2+ | Atrás (`sigetAccent.cancelar`, `ChevronLeft`, `onClick={handleAtras}`) | Siguiente o Enviar |
| Último | Atrás | Enviar (`sigetAccent.guardar`, `Send` → `Check`, `ariaBusy` si pending) |

Deshabilitar **Siguiente** con reglas de negocio del paso (ej. fechas incompletas en paso 1) además de `isPending`.

Centrar acciones: `GvModalFooter className="flex flex-wrap items-center justify-center gap-2"`.

### Plantilla mínima wizard

```tsx
<GvModalShell open={open} onClose={onClose} title="Título del flujo" maxWidth="max-w-lg">
  {open ? (
    <GvModalForm
      onSubmit={(e) => {
        e.preventDefault();
        if (wizardStep < WIZARD_PASOS) handleSiguiente();
        else handleEnviarClick();
      }}
    >
      <GvModalFormBody className="space-y-4">
        {/* barra de progreso WIZARD_PASOS_META */}
        <div className={cn("space-y-3", WIZARD_CONTENIDO_MIN_H)}>
          <div className={cn("space-y-3", wizardStep !== 1 && "hidden")} aria-hidden={wizardStep !== 1}>
            {/* campos paso 1 */}
          </div>
          <div className={cn("space-y-3", wizardStep !== 2 && "hidden")} aria-hidden={wizardStep !== 2}>
            {/* campos paso 2 */}
          </div>
        </div>
      </GvModalFormBody>
      <GvModalFooter className="flex flex-wrap items-center justify-center gap-2">
        {/* Cancelar / Atrás + SigetActionButton submit */}
      </GvModalFooter>
    </GvModalForm>
  ) : null}
</GvModalShell>
```

### Prohibiciones wizard

- Desmontar pasos con animación que destruya hooks de datos del paso 1.
- `Dialog` de shadcn o segundo modal encima sin `ModalConfirmDelete`.
- Validación `shouldValidate: true` al limpiar campos sincronizados desde UI compleja (calendario); preferir `shouldValidate: false` y validar en **Siguiente**.

## Confirmación destructiva

```tsx
import { ModalConfirmDelete } from "@/components/ui/general-modal";

{confirmando && (
  <ModalConfirmDelete
    message="¿Eliminar este registro? Esta acción no se puede deshacer."
    pending={eliminar.isPending}
    onCancel={() => setConfirmando(false)}
    onConfirm={async () => {
      const res = await eliminar.mutateAsync(id);
      if (res.success) {
        toast.success("Eliminado.");
        onClose();
        return;
      }
      toast.error(modalActionMessage(res.error ?? undefined, "No se pudo eliminar."));
    }}
  />
)}
```

Feedback con toast: skill `ui-toastify`. Fechas: skill `componente-fechas-gt`.
