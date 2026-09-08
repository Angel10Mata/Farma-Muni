export const TIMEZONE_GT = "America/Guatemala" as const;
export const LOCALE_GT = "es-GT" as const;

const fechaCalendarioRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
const mesCalendarioRegex = /^(\d{4})-(\d{2})$/;

export function fechaCalendarioGt(fecha = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_GT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

export function mesCalendarioGt(fecha = new Date()): string {
  return fechaCalendarioGt(fecha).slice(0, 7);
}

export function normalizarFechaCalendario(
  value: string | null | undefined,
): string {
  if (!value) return "";
  const solo = value.split("T")[0];
  return fechaCalendarioRegex.test(solo) ? solo : "";
}

export function normalizarMesCalendario(
  value: string | null | undefined,
): string {
  if (!value) return "";
  if (mesCalendarioRegex.test(value)) return value;
  const fecha = normalizarFechaCalendario(value);
  return fecha ? fecha.slice(0, 7) : "";
}

export function formatFechaCalendarioGt(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "long",
    year: "numeric",
  },
): string {
  const fecha = normalizarFechaCalendario(value);
  if (!fecha) return "\u2014";

  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  return new Intl.DateTimeFormat(LOCALE_GT, {
    timeZone: TIMEZONE_GT,
    ...options,
  }).format(date);
}

export function formatFechaHoraGt(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  },
): string {
  if (!value) return "\u2014";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "\u2014";

  return new Intl.DateTimeFormat(LOCALE_GT, {
    timeZone: TIMEZONE_GT,
    ...options,
  }).format(date);
}

function formatAmPmGt(dayPeriod: string): string {
  const letter = dayPeriod.replace(/[^ap]/gi, "").toUpperCase();
  return letter === "P" ? "P.M." : "A.M.";
}

function formatDiaSemanaCortoGt(weekday: string): string {
  const limpio = weekday.replace(/\./g, "").trim();
  if (!limpio) return "";
  return limpio.charAt(0).toUpperCase() + limpio.slice(1, 3).toLowerCase();
}

function partesFechaHoraTablaGt(value: string | null | undefined): {
  fecha: string;
  hora: string;
} | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat(LOCALE_GT, {
    timeZone: TIMEZONE_GT,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value ?? "";

  return {
    fecha: `${formatDiaSemanaCortoGt(weekday)} ${day}/${month}/${year}`,
    hora: `${hour}:${minute} ${formatAmPmGt(dayPeriod)}`,
  };
}

export function formatFechaTablaGt(value: string | null | undefined): string {
  return partesFechaHoraTablaGt(value)?.fecha ?? "\u2014";
}

export function formatHoraTablaGt(value: string | null | undefined): string {
  return partesFechaHoraTablaGt(value)?.hora ?? "\u2014";
}

export function formatFechaHoraTablaGt(
  value: string | null | undefined,
): string {
  const partes = partesFechaHoraTablaGt(value);
  if (!partes) return "\u2014";
  return `${partes.fecha}, ${partes.hora}`;
}

export function formatFechaHoraTablaCompactGt(
  value: string | null | undefined,
): string {
  const partes = partesFechaHoraTablaGt(value);
  if (!partes) return "\u2014";
  return `${partes.fecha} ${partes.hora}`;
}

export function mesCalendarioToTimestamptz(mes: string): string {
  const normalizado = normalizarMesCalendario(mes);
  if (!normalizado) throw new Error("INVALID_MONTH");
  return `${normalizado}-01T12:00:00.000Z`;
}

export function timestamptzToMesCalendario(
  value: string | null | undefined,
): string {
  if (!value) return mesCalendarioGt();

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return mesCalendarioGt();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_GT,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;

  return y && m ? `${y}-${m}` : mesCalendarioGt();
}

export function formatFechaManualGt(value: string | null | undefined): string {
  const norm = normalizarFechaCalendario(value);
  if (!norm) return "";
  const [y, m, d] = norm.split("-");
  return `${d}/${m}/${y}`;
}

export function parseFechaManualGt(formatted: string): string | null {
  if (formatted.length !== 10) return null;
  const [dd, mm, yyyy] = formatted.split("/");
  if (!dd || !mm || !yyyy || dd.length !== 2 || mm.length !== 2 || yyyy.length !== 4) {
    return null;
  }
  const d = Number(dd);
  const m = Number(mm);
  const y = Number(yyyy);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  const iso = `${yyyy}-${mm}-${dd}`;
  return normalizarFechaCalendario(iso) ? iso : null;
}

export interface IntervaloSemana {
  label: string;
  desde: string;
  hasta: string;
}

export function obtenerSemanasDelMes(month: number, year: number): IntervaloSemana[] {
  const semanas: IntervaloSemana[] = [];
  const ultimoDia = new Date(year, month + 1, 0);
  const totalDias = ultimoDia.getDate();

  let diaInicio = 1;

  while (diaInicio <= totalDias) {
    const fechaInicio = new Date(year, month, diaInicio);
    const diasHastaDomingo = fechaInicio.getDay() === 0 ? 0 : 7 - fechaInicio.getDay();
    let diaFin = diaInicio + diasHastaDomingo;
    if (diaFin > totalDias) {
      diaFin = totalDias;
    }

    const fechaFin = new Date(year, month, diaFin);

    const formatDia = (d: Date) => {
      const nombresDias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      return `${nombresDias[d.getDay()]} ${d.getDate()}`;
    };

    const pad = (n: number) => n.toString().padStart(2, "0");
    const desdeStr = `${year}-${pad(month + 1)}-${pad(diaInicio)}`;
    const hastaStr = `${year}-${pad(month + 1)}-${pad(diaFin)}`;

    semanas.push({
      label: `${formatDia(fechaInicio)} - ${formatDia(fechaFin)}`,
      desde: desdeStr,
      hasta: hastaStr,
    });

    diaInicio = diaFin + 1;
  }

  return semanas;
}
