---
name: ui-modales
description: Implementa formularios y ventanas flotantes con ModalShell de general-modal.tsx — ModalInput, ModalFooter, ModalConfirmDelete y feedback con toast. Se usa al crear o editar modales, formularios en overlay o confirmaciones destructivas dentro de un modal.
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
