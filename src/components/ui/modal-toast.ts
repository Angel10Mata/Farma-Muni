import { toast } from "react-toastify";

export { toast };

export const MODAL_ACTION_ERRORS: Record<string, string> = {
  UNAUTHORIZED: "No autorizado. Inicie sesión nuevamente.",
  FORBIDDEN: "No tienes permiso para realizar esta acción.",
  VALIDATION: "Revisa los datos del formulario.",
  INVALID_INPUT: "Revisa los datos del formulario.",
  NOT_FOUND: "El registro no fue encontrado.",
  INTERNAL: "Error interno, inténtelo más tarde.",
  DB_ERROR: "No se pudo guardar. Intenta de nuevo.",
  SAVE_FAILED: "No se pudo guardar. Intenta de nuevo.",
  DELETE_FAILED: "No se pudo eliminar.",
  DUPLICATE: "Este registro ya existe.",
  NOT_EXPIRED: "El producto aún no está vencido.",
  NO_STOCK: "No hay existencias que dar de baja.",
};

export function modalActionMessage(
  code: string | undefined,
  fallback: string,
  extra?: Record<string, string>,
) {
  if (!code) return fallback;
  return extra?.[code] ?? MODAL_ACTION_ERRORS[code] ?? fallback;
}

export function actionErrorMessage(
  result: { error?: string | null; detail?: string | null },
  fallback: string,
) {
  if (result.detail?.trim()) return result.detail;
  return modalActionMessage(result.error ?? undefined, fallback);
}
