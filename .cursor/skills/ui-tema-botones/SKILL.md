---
name: ui-tema-botones
description: Botón de acción predefinido SIGET — RippleButton + MorphHoverIcon, una palabra e icono a la derecha. Se usa en TODA acción clickeable de la app (pantallas, modales, listas, cards) sin excepción.
---

# Botón de acción SIGET (obligatorio)

**Todo botón de acción** del sistema usa el mismo patrón, **sin excepción**: pantallas, modales, tablas, cards, headers, formularios inline.

## Implementación única

```tsx
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { Pencil, SquarePen } from "lucide";

<SigetActionButton
  label="Editar"
  accentColor={sigetAccent.editar}
  morphFrom={Pencil}
  morphTo={SquarePen}
  onClick={handleEditar}
  ariaLabel="Editar registro"
  className="w-auto shrink-0"
/>
```

Componente: `@/components/ui/siget-action-button.tsx`  
Ripple: `@/components/ui/ripple-button` (Magic UI)  
Icono: `@/components/ui/morph-hover-icon` + par Lucide `from` / `to` importados desde **`lucide`** (no `lucide-react`; MorphIcon requiere `IconNode`).

## Reglas de layout (obligatorias)

| Regla | Valor |
|-------|--------|
| Texto | **Una sola palabra** (`Editar`, `Guardar`, `Abrir`, `Enlace`, `Crear`, `Quitar`…) |
| Icono | **A la derecha** del texto, morph al hover |
| Contenido | Centrado en el botón (`justify-center`) |
| Padding | Simétrico (`px-2.5`) |
| Altura | `h-9` |
| Tipografía | `text-xs font-bold` |
| Superficie | Fondo blanco, `border-2 border-border`, **sin sombra** (`shadow-none`; el componente ya lo incluye) |
| Color | Misma tonalidad en **texto e icono** vía `accentColor` |
| Ripple | Gris claro `#E5E7EB` salvo caso especial |
| Cursor | `cursor-pointer`; deshabilitado → `opacity-60` |

## Prohibido

- `<button>` suelto con clases Tailwind ad hoc para acciones.
- `Button` de shadcn, `ShinyButton`, `InteractiveHoverButton`, CTAs con fondo sólido de marca, botones sin icono morph.
- Texto de más de una palabra en el label visible (usar `ariaLabel` para descripción larga).
- Icono a la izquierda del texto.
- Fondos semánticos de color en el botón (sky-100, emerald-100, etc.); solo blanco/card + acento en texto/icono.
- **Sombras en botones.** Prohibido `shadow`, `shadow-sm`, `shadow-md`, `shadow-lg` o cualquier `drop-shadow` en `SigetActionButton` / `RippleButton` / `className`. La superficie es plana: solo borde.

## Paleta `sigetAccent`

| Token | Uso |
|-------|-----|
| `abrir` | Abrir enlace externo |
| `enlace` | Copiar enlace |
| `activa` / `inactiva` | Toggle estado |
| `editar` | Editar registro |
| `guardar` | Confirmar formulario |
| `cancelar` | Cerrar / descartar |
| `quitar` | Eliminar ítem inline |
| `crear` | Alta / nuevo |
| `excel` | Exportar / descargar Excel |

Añadir tokens en `sigetAccent` si hace falta otro matiz; no hardcodear hex fuera del archivo.

## Ancho

- En grillas o filas de acciones: `className="w-full"` (default).
- Acción suelta en header/toolbar: `className="w-auto shrink-0"`.

## Modales

En `ModalFooter` sustituir `ModalSubmit` y botones cancelar legacy por `SigetActionButton`:

```tsx
<SigetActionButton
  label="Cancelar"
  accentColor={sigetAccent.cancelar}
  morphFrom={X}
  morphTo={X}
  morphOnHover={false}
  onClick={onClose}
  className="w-auto shrink-0"
/>
<SigetActionButton
  label="Guardar"
  accentColor={sigetAccent.guardar}
  morphFrom={Save}
  morphTo={Check}
  onClick={handleSubmit}
  disabled={pending}
  className="w-auto shrink-0"
/>
```

## Toggle / switch visual

Usar `SigetActionButton` con `role="switch"`, label `Activa` / `Inactiva`, iconos `LockOpen` / `Lock`. Transición de estado solo tras confirmar en DB; morph al hover permitido.

## Superficies zinc (resto de la UI)

| Contexto | Claro | Oscuro |
|----------|-------|--------|
| Fondo de página | blanco | `zinc-900` |
| Cards / componentes | `zinc-50` | `zinc-800` |
| Header / layout | `zinc-100` | `zinc-800` |

Menús flotantes: fondo opaco `bg-white dark:bg-zinc-900`, `z-[200]`.
