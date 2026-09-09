/**
 * FarmaciaSaludLogo — SVG nativo, 100 % transparente.
 * Cruz médica + corazón con hojas, en tonos azul / verde salvia.
 * Se adapta al tamaño del contenedor padre mediante `className`.
 *
 * Usa useId() para que los gradientes sean únicos cuando hay
 * varias instancias del logo en la misma página.
 */

import { useId } from "react";
import { cn } from "@/lib/utils";

interface FarmaciaSaludLogoProps {
  className?: string;
  /** Cuando es true se usan colores aptos para impresión (sin gradientes con opacity) */
  print?: boolean;
}

export default function FarmaciaSaludLogo({ className, print = false }: FarmaciaSaludLogoProps) {
  const uid = useId().replace(/:/g, "");

  const blueId  = `fs-blue-${uid}`;
  const greenId = `fs-green-${uid}`;
  const leafId  = `fs-leaf-${uid}`;
  const crossId = `fs-cross-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      fill="none"
      className={cn("shrink-0", className)}
      aria-label="Logo FarmaMuni"
      role="img"
    >
      <defs>
        {/* Gradiente azul para el arco izquierdo y la cruz */}
        <linearGradient id={blueId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a8fcb" />
          <stop offset="100%" stopColor="#145f8a" />
        </linearGradient>
        {/* Gradiente verde para el arco derecho y las hojas */}
        <linearGradient id={greenId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6fbf4a" />
          <stop offset="50%" stopColor="#4ca84c" />
          <stop offset="100%" stopColor="#3a8a3a" />
        </linearGradient>
        {/* Gradiente verde claro para hoja secundaria */}
        <linearGradient id={leafId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4caf50" />
          <stop offset="100%" stopColor="#81c784" />
        </linearGradient>
        {/* Gradiente azul oscuro para la cruz */}
        <linearGradient id={crossId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2196f3" />
          <stop offset="100%" stopColor="#1565c0" />
        </linearGradient>
      </defs>

      {/* ──── Anillo exterior ──── */}
      {/* Arco izquierdo (azul) — semicírculo izquierdo del anillo */}
      <path
        d="M100 18 C55 18 18 55 18 100 C18 145 55 182 100 182"
        stroke={`url(#${blueId})`}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arco derecho (verde) — semicírculo derecho del anillo */}
      <path
        d="M100 18 C145 18 182 55 182 100 C182 145 145 182 100 182"
        stroke={`url(#${greenId})`}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />

      {/* ──── Cruz médica ──── */}
      {/* Barra horizontal */}
      <rect
        x="52"
        y="80"
        width="52"
        height="24"
        rx="4"
        fill={`url(#${crossId})`}
      />
      {/* Barra vertical */}
      <rect
        x="66"
        y="60"
        width="24"
        height="62"
        rx="4"
        fill={`url(#${crossId})`}
      />

      {/* ──── Corazón con hojas ──── */}
      {/* Forma del corazón (mitad derecha del logo) */}
      <path
        d="M108 82 C108 72 118 62 130 62 C142 62 152 72 152 84 C152 108 120 138 108 148 C96 138 90 124 90 112 C90 102 96 92 108 82Z"
        fill={`url(#${greenId})`}
        opacity={print ? 1 : 0.85}
      />

      {/* Hoja principal (dentro del corazón) */}
      <path
        d="M108 140 C108 140 112 110 118 100 C124 90 136 78 136 78 C136 78 128 96 122 108 C116 120 108 140 108 140Z"
        fill={`url(#${leafId})`}
        opacity="0.9"
      />
      {/* Hoja secundaria (más pequeña) */}
      <path
        d="M108 140 C108 140 104 116 100 108 C96 100 90 92 90 92 C90 92 100 100 104 110 C108 120 108 140 108 140Z"
        fill={`url(#${leafId})`}
        opacity="0.75"
      />

      {/* Tallo central */}
      <line
        x1="108"
        y1="98"
        x2="108"
        y2="145"
        stroke="#2e7d32"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
