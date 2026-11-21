import {
  obtenerDatosInstitucionales,
  type MetaInforme,
} from "./identidad";

export async function construirMetaInforme(
  generadoPor: string,
): Promise<MetaInforme> {
  const institucion = await obtenerDatosInstitucionales();
  const nombre = generadoPor.trim();
  return {
    institucion,
    generadoPor: nombre || "Usuario",
  };
}
