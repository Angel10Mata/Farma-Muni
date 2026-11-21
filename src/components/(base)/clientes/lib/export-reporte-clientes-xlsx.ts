import type { MetaInforme } from "@/lib/reportes/identidad";
import { nombreArchivo } from "@/lib/reportes/nombres";
import {
  crearLibro,
  guardarLibro,
  hojaConEncabezado,
  tablaExcel,
  type ColumnaExcel,
} from "@/lib/reportes/excel-base";
import { fechaCalendarioGt } from "@/lib/fechas-gt";
import type { Cliente } from "./zod";
import { etiquetaNitCliente } from "@/components/(base)/creditos/lib/creditos-reporte-helpers";

type FilaExcel = {
  nombre: string;
  nit: string;
  telefono: string;
  correo: string;
  direccion: string;
  compras: number;
  saldo: number;
};

const columnas: ColumnaExcel<FilaExcel>[] = [
  { titulo: "Nombre", clave: "nombre", tipo: "texto", ancho: 28 },
  { titulo: "NIT", clave: "nit", tipo: "texto", ancho: 14 },
  { titulo: "Teléfono", clave: "telefono", tipo: "texto", ancho: 14 },
  { titulo: "Correo", clave: "correo", tipo: "texto", ancho: 22 },
  { titulo: "Dirección", clave: "direccion", tipo: "texto", ancho: 28 },
  { titulo: "Compras", clave: "compras", tipo: "entero", ancho: 10 },
  { titulo: "Saldo pendiente", clave: "saldo", tipo: "moneda", ancho: 14 },
];

export async function descargarReporteClientesExcel(
  clientes: Cliente[],
  meta: MetaInforme,
) {
  const hoy = fechaCalendarioGt();
  const wb = crearLibro();
  const { ws, filaInicio } = hojaConEncabezado(wb, "Clientes", {
    titulo: "Directorio de clientes",
    periodo: `${clientes.length} registros · ${hoy}`,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
    columnasMerge: columnas.length,
  });

  const filas: FilaExcel[] = clientes.map((c) => ({
    nombre: c.nombre,
    nit: etiquetaNitCliente(c.nit === "C/F" ? null : c.nit),
    telefono: c.telefono === "No registrado" ? "" : c.telefono,
    correo: c.email === "No registrado" ? "" : c.email,
    direccion: c.direccion === "No registrada" ? "" : c.direccion,
    compras: c.totalCompras,
    saldo: c.saldo,
  }));

  tablaExcel(ws, filaInicio, columnas, filas, {
    totales: true,
    etiquetaTotales: "Totales",
  });

  await guardarLibro(wb, nombreArchivo("Clientes", hoy, "xlsx"));
}
