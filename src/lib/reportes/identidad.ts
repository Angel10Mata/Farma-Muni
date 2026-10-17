import { formatFechaHoraGt } from "@/lib/fechas-gt";

export type DatosInstitucionales = {
  farmaciaNombre: string;
  farmaciaDireccion: string;
  farmaciaTelefono: string;
  entidad: "Municipalidad de Concepción Las Minas";
};

export const ENTIDAD_MUNICIPAL =
  "Municipalidad de Concepción Las Minas" as const;

export const PALETA = {
  primario: "#525D53",
  secundario: "#8DA78E",
  claro: "#E8F0E9",
  texto: "#18181B",
  gris: "#71717A",
  rojo: "#B91C1C",
  ambar: "#B45309",
} as const;

export const PALETA_RGB = {
  primario: [82, 93, 83] as [number, number, number],
  secundario: [141, 167, 142] as [number, number, number],
  claro: [232, 240, 233] as [number, number, number],
  texto: [24, 24, 27] as [number, number, number],
  gris: [113, 113, 122] as [number, number, number],
  rojo: [185, 28, 28] as [number, number, number],
  ambar: [180, 83, 9] as [number, number, number],
  blanco: [255, 255, 255] as [number, number, number],
};

export function hexArgb(hex: string): string {
  const limpio = hex.replace("#", "");
  return `FF${limpio.toUpperCase()}`;
}

export function datosInstitucionalesPorDefecto(): DatosInstitucionales {
  return {
    entidad: ENTIDAD_MUNICIPAL,
    farmaciaNombre: "FarmaMuni",
    farmaciaDireccion: "",
    farmaciaTelefono: "",
  };
}

export function datosDesdeAppSettings(row: {
  farmacia_nombre?: string | null;
  farmacia_direccion?: string | null;
  farmacia_telefono?: string | null;
} | null): DatosInstitucionales {
  const base = datosInstitucionalesPorDefecto();
  if (!row) return base;
  return {
    entidad: ENTIDAD_MUNICIPAL,
    farmaciaNombre: row.farmacia_nombre?.trim() || base.farmaciaNombre,
    farmaciaDireccion: row.farmacia_direccion?.trim() || "",
    farmaciaTelefono: row.farmacia_telefono?.trim() || "",
  };
}

export type MetaInforme = {
  institucion: DatosInstitucionales;
  generadoPor: string;
};

export function textoGeneradoInforme(generadoPor: string): string {
  const cuando = formatFechaHoraGt(new Date().toISOString(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `Generado por ${generadoPor} el ${cuando}`;
}

export { obtenerDatosInstitucionales } from "./obtener-datos-institucionales";
