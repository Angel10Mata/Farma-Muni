import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// CLASES TAILWIND

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// FORMATO NUMÉRICO Y MONEDA

/**
 * Formatea un número entero con separador de miles (coma).
 * Ej: 10000 → "10,000"
 */
export function fmtNum(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * Formatea un monto en Quetzales con comas y 2 decimales.
 * Ej: 10000 → "Q10,000.00"
 */
export function fmtQ(value: number): string {
  return `Q${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// TEMA SWEETALERT

export const getSwalThemeOpts = () => {
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  return {
    background: isDark ? "#18181b" : "#F5F5F1",
    color: isDark ? "#F5F5F1" : "#525D53",
    confirmButtonColor: "#8DA78E",
    cancelButtonColor: "#525D53",
    customClass: {
      popup: "!rounded-3xl border-0",
    }
  };
};
