import { obtenerSemanasDelMes } from "@/lib/fechas-gt";

export type PeriodoFinanzasState = {
  tipoFiltroFecha: string;
  fechaDia: string;
  activeMonth: number;
  activeYear: number;
  selectedWeekIndex: number;
  fechaRangoDesde: string;
  fechaRangoHasta: string;
};

export function periodoFinanzasInicial(): PeriodoFinanzasState {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const d = new Date();
  return {
    tipoFiltroFecha: "semana",
    fechaDia: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    activeMonth: d.getMonth(),
    activeYear: d.getFullYear(),
    selectedWeekIndex: -1,
    fechaRangoDesde: "",
    fechaRangoHasta: "",
  };
}

export function calcularRangoPeriodoFinanzas(
  state: PeriodoFinanzasState,
  options?: { diaEsMesCompleto?: boolean },
): {
  desde?: string;
  hasta?: string;
  resumenDesde?: string;
  resumenHasta?: string;
} {
  const pad = (n: number) => n.toString().padStart(2, "0");
  let d: string | undefined;
  let h: string | undefined;
  let rD: string | undefined;
  let rH: string | undefined;

  const { tipoFiltroFecha, fechaDia, activeMonth, activeYear, selectedWeekIndex, fechaRangoDesde, fechaRangoHasta } =
    state;

  if (tipoFiltroFecha === "dia" && fechaDia) {
    const parts = fechaDia.split("-");
    const y = parts[0];
    const m = parts[1];
    if (options?.diaEsMesCompleto && y && m) {
      const ultimoDia = new Date(Number(y), Number(m), 0).getDate();
      d = `${y}-${m}-01T00:00:00.000-06:00`;
      h = `${y}-${m}-${pad(ultimoDia)}T23:59:59.999-06:00`;
      rD = d;
      rH = h;
    } else {
      d = `${fechaDia}T00:00:00.000-06:00`;
      h = `${fechaDia}T23:59:59.999-06:00`;
      const day = parts[2] ?? "01";
      const ultimoDia = new Date(Number(y), Number(m), 0).getDate();
      rD = `${y}-${m}-01T00:00:00.000-06:00`;
      rH = `${y}-${m}-${pad(ultimoDia)}T23:59:59.999-06:00`;
    }
  } else if (tipoFiltroFecha === "semana") {
    const semanas = obtenerSemanasDelMes(activeMonth, activeYear);
    const ultimoDia = new Date(activeYear, activeMonth + 1, 0).getDate();
    const mesCompletoDesde = `${activeYear}-${pad(activeMonth + 1)}-01T00:00:00.000-06:00`;
    const mesCompletoHasta = `${activeYear}-${pad(activeMonth + 1)}-${pad(ultimoDia)}T23:59:59.999-06:00`;

    rD = mesCompletoDesde;
    rH = mesCompletoHasta;

    if (selectedWeekIndex === -1) {
      d = mesCompletoDesde;
      h = mesCompletoHasta;
    } else {
      const sem = semanas[selectedWeekIndex];
      if (sem) {
        d = `${sem.desde}T00:00:00.000-06:00`;
        h = `${sem.hasta}T23:59:59.999-06:00`;
      }
    }
  } else if (tipoFiltroFecha === "rango") {
    if (fechaRangoDesde) {
      d = `${fechaRangoDesde}T00:00:00.000-06:00`;
      rD = d;
    }
    if (fechaRangoHasta) {
      h = `${fechaRangoHasta}T23:59:59.999-06:00`;
      rH = h;
    }
  }

  return { desde: d, hasta: h, resumenDesde: rD, resumenHasta: rH };
}
