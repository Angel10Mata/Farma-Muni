import { fechaCalendarioGt } from "@/lib/fechas-gt";

function slugInforme(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function nombreArchivo(
  informe: string,
  periodo?: string,
  extension: "pdf" | "xlsx" = "pdf",
): string {
  const slug = slugInforme(informe) || "Informe";
  const sufijo = periodo?.trim()
    ? slugInforme(periodo)
    : fechaCalendarioGt();
  return `FarmaMuni_${slug}_${sufijo}.${extension}`;
}
