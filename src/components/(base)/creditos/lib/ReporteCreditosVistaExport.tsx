"use client";

import { useEffect, type CSSProperties } from "react";
import { fmtQ } from "@/lib/utils";
import {
  etiquetaReciboCredito,
  formatFechaCortaGt,
  resumenCuentasPorCobrar,
  resumenPorEstadoVencimiento,
  type EstadoVencimientoCredito,
  type LineaCreditoReporte,
} from "./creditos-reporte-helpers";

const T = {
  brand: "#8DA78E",
  brandDark: "#3B5240",
  amount: "#2F5D45",
  muted: "#71717a",
  mint: "#EEF4EF",
  mintBorder: "#C5D9C7",
  headBg: "#F3F6F4",
  headText: "#5A7D62",
  zinc100: "#f4f4f5",
  zinc200: "#e4e4e7",
  okBg: "#DCE8DF",
  okText: "#2E7D32",
  warnBg: "#FEF3C7",
  warnText: "#B45309",
  dangerBg: "#FEE2E2",
  dangerText: "#B91C1C",
};

const BORDER = `1px solid ${T.zinc200}`;

const tableGrid: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 11,
};

const thCell: CSSProperties = {
  border: BORDER,
  padding: "9px 7px",
  fontSize: 9,
  fontWeight: 700,
  color: T.muted,
  textAlign: "left",
  backgroundColor: T.zinc100,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const tdCell: CSSProperties = {
  border: BORDER,
  padding: "9px 7px",
  fontSize: 11,
  color: "#18181b",
  verticalAlign: "middle",
  backgroundColor: "#ffffff",
};

function estadoCelda(estado: EstadoVencimientoCredito): CSSProperties {
  const c = badgeColors(estado);
  return {
    ...tdCell,
    textAlign: "center",
    backgroundColor: c.bg,
    color: c.text,
    fontWeight: 700,
    fontSize: 10,
  };
}

const pageStyle: CSSProperties = {
  width: 794,
  minHeight: 1123,
  boxSizing: "border-box",
  padding: "40px 44px",
  backgroundColor: "#ffffff",
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  color: "#18181b",
  fontSize: 13,
  lineHeight: 1.35,
};

function BulletSection({ title }: { title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 6,
        marginBottom: 12,
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          backgroundColor: T.brand,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: T.brandDark,
        }}
      >
        {title}
      </span>
    </div>
  );
}

function HeaderBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.brand,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        FARMAMUNI · CLIENTES Y CRÉDITOS
      </div>
      <h1
        style={{
          margin: 0,
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "#18181b",
        }}
      >
        {title}
      </h1>
      <p style={{ margin: "8px 0 14px", fontSize: 14, color: T.muted }}>
        {subtitle}
      </p>
      <div
        style={{ height: 2, backgroundColor: T.brand, marginBottom: 22 }}
      />
    </>
  );
}

function badgeColors(estado: EstadoVencimientoCredito) {
  if (estado === "Vencido") {
    return { bg: T.dangerBg, dot: T.dangerText, text: T.dangerText };
  }
  if (estado === "Próximo a vencer") {
    return { bg: T.warnBg, dot: T.warnText, text: T.warnText };
  }
  return { bg: T.okBg, dot: T.okText, text: T.okText };
}

function Pie({
  lines,
  generadoPor,
}: {
  lines: string[];
  generadoPor: string;
}) {
  return (
    <div style={{ marginTop: 28, color: T.muted, fontSize: 11, lineHeight: 1.5 }}>
      {lines.map((line) => (
        <p key={line} style={{ margin: "0 0 8px" }}>{line}</p>
      ))}
      <p style={{ margin: "0 0 8px" }}>
        Reporte realizado por: {generadoPor}
      </p>
      <p style={{ margin: 0 }}>
        FarmaMuni — sistema de gestión farmacéutica. Reporte generado
        automáticamente para uso interno.
      </p>
    </div>
  );
}

function PaginaCuentas({
  lineas,
  generadoPor,
}: {
  lineas: LineaCreditoReporte[];
  generadoPor: string;
}) {
  const hoy = formatFechaCortaGt(new Date());
  const resumen = resumenCuentasPorCobrar(lineas);
  const ordenadas = [...lineas].sort((a, b) =>
    a.cliente_nombre.localeCompare(b.cliente_nombre),
  );

  return (
    <div data-reporte-page style={pageStyle}>
      <HeaderBlock
        title="Cuentas por cobrar"
        subtitle={`Al ${hoy} — saldo pendiente por cliente`}
      />

      <BulletSection title="Resumen" />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          backgroundColor: T.mint,
          border: `1px solid ${T.mintBorder}`,
          borderLeft: `5px solid ${T.brandDark}`,
          borderRadius: 10,
          padding: "18px 20px",
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.brandDark,
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            TOTAL POR COBRAR
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: T.amount,
              letterSpacing: "-0.02em",
            }}
          >
            {fmtQ(resumen.total)}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            textAlign: "right",
            fontSize: 13,
            color: T.muted,
            lineHeight: 1.45,
          }}
        >
          {resumen.clientes} clientes con saldo / {fmtQ(resumen.promedio)} de
          saldo promedio
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          ["CLIENTES CON SALDO", String(resumen.clientes)],
          ["SALDO PROMEDIO", fmtQ(resumen.promedio)],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              flex: 1,
              backgroundColor: T.zinc100,
              border: `1px solid ${T.zinc200}`,
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: T.brandDark,
                letterSpacing: "0.05em",
                marginBottom: 6,
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>

      <BulletSection title="Saldo por cliente" />

      <table style={tableGrid}>
        <thead>
          <tr>
            {[
              "CLIENTE",
              "RECIBO",
              "FECHA DE VENTA",
              "MONTO DEL CRÉDITO",
              "VENCE EL",
              "ESTADO",
            ].map((h) => (
              <th key={h} style={thCell}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((l) => (
            <tr key={l.venta_id}>
              <td style={tdCell}>{l.cliente_nombre}</td>
              <td style={tdCell}>{etiquetaReciboCredito(l)}</td>
              <td style={tdCell}>{formatFechaCortaGt(l.fecha_venta)}</td>
              <td style={{ ...tdCell, textAlign: "right" }}>
                {fmtQ(l.saldo_pendiente)}
              </td>
              <td style={tdCell}>{formatFechaCortaGt(l.fecha_vence_iso)}</td>
              <td style={estadoCelda(l.estado_vencimiento)}>
                {l.estado_vencimiento}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={3}
              style={{
                ...tdCell,
                fontWeight: 700,
                color: T.brandDark,
                fontSize: 12,
              }}
            >
              Total por cobrar
            </td>
            <td
              style={{
                ...tdCell,
                textAlign: "right",
                fontWeight: 800,
                color: T.amount,
                fontSize: 13,
              }}
            >
              {fmtQ(resumen.total)}
            </td>
            <td style={tdCell} />
            <td style={tdCell} />
          </tr>
        </tfoot>
      </table>

      <Pie
        generadoPor={generadoPor}
        lines={[
          "El saldo pendiente se calcula como el monto total del crédito menos los abonos registrados. Sin abonos parciales a la fecha, plazo de crédito 30 días.",
        ]}
      />
    </div>
  );
}

function TarjetaResumenEstado({
  label,
  value,
  bg,
  color,
}: {
  label: string;
  value: number;
  bg: string;
  color: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: bg,
        border: `1px solid ${T.zinc200}`,
        borderRadius: 10,
        padding: "14px 14px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 9,
          fontWeight: 800,
          color,
          letterSpacing: "0.03em",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: color,
          }}
        />
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function PaginaVencimientos({
  lineas,
  generadoPor,
}: {
  lineas: LineaCreditoReporte[];
  generadoPor: string;
}) {
  const hoy = formatFechaCortaGt(new Date());
  const est = resumenPorEstadoVencimiento(lineas);
  const ordenadas = [...lineas].sort(
    (a, b) =>
      new Date(a.fecha_vence_iso).getTime() -
      new Date(b.fecha_vence_iso).getTime(),
  );

  return (
    <div data-reporte-page style={pageStyle}>
      <HeaderBlock
        title="Créditos próximos a vencer o vencidos"
        subtitle={`Al ${hoy} — para dar seguimiento al personal de cobros`}
      />

      <BulletSection title="Resumen por estado" />

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <TarjetaResumenEstado
          label="VENCIDOS"
          value={est.vencidos}
          bg={T.dangerBg}
          color={T.dangerText}
        />
        <TarjetaResumenEstado
          label="PRÓXIMOS A VENCER (≤7 DÍAS)"
          value={est.proximos}
          bg={T.warnBg}
          color={T.warnText}
        />
        <TarjetaResumenEstado
          label="AL DÍA"
          value={est.alDia}
          bg={T.okBg}
          color={T.okText}
        />
      </div>

      {est.vencidos + est.proximos === 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            backgroundColor: T.okBg,
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 18,
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              backgroundColor: T.brand,
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            ✓
          </span>
          <p style={{ margin: 0, fontSize: 13, color: T.brandDark }}>
            No hay créditos vencidos ni próximos a vencer en este momento. El
            detalle de fechas queda abajo como referencia.
          </p>
        </div>
      ) : null}

      <BulletSection
        title="Detalle de créditos, ordenado por fecha de vencimiento"
      />

      <table style={tableGrid}>
        <thead>
          <tr>
            {[
              "CLIENTE",
              "RECIBO",
              "SALDO",
              "VENCE EL",
              "DÍAS RESTANTES",
              "ESTADO",
            ].map((h) => (
              <th key={h} style={thCell}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((l) => (
            <tr key={`v-${l.venta_id}`}>
              <td style={tdCell}>{l.cliente_nombre}</td>
              <td style={tdCell}>{etiquetaReciboCredito(l)}</td>
              <td style={{ ...tdCell, textAlign: "right" }}>
                {fmtQ(l.saldo_pendiente)}
              </td>
              <td style={tdCell}>{formatFechaCortaGt(l.fecha_vence_iso)}</td>
              <td style={{ ...tdCell, textAlign: "center" }}>
                {l.dias_restantes < 0
                  ? `${Math.abs(l.dias_restantes)} vencido`
                  : l.dias_restantes}
              </td>
              <td style={estadoCelda(l.estado_vencimiento)}>
                {l.estado_vencimiento}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pie
        generadoPor={generadoPor}
        lines={[
          "Vencido = días restantes negativos · Próximo a vencer = 0 a 7 días · Al día = más de 7 días. Término de crédito asumido: 30 días desde la fecha de venta — ajustable según la política real de la farmacia.",
        ]}
      />
    </div>
  );
}

export type ReporteCreditosVistaExportProps = {
  lineas: LineaCreditoReporte[];
  generadoPor: string;
  onReady: () => void;
};

export function ReporteCreditosVistaExport({
  lineas,
  generadoPor,
  onReady,
}: ReporteCreditosVistaExportProps) {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => onReady());
    });
    return () => cancelAnimationFrame(id);
  }, [onReady]);

  const hoy = formatFechaCortaGt(new Date());

  if (lineas.length === 0) {
    return (
      <div data-reporte-page style={pageStyle}>
        <HeaderBlock
          title="Cuentas por cobrar"
          subtitle={`Al ${hoy} — sin saldos pendientes`}
        />
        <p style={{ color: T.muted, fontSize: 14 }}>
          No hay créditos con saldo pendiente en este momento.
        </p>
        <Pie generadoPor={generadoPor} lines={[]} />
      </div>
    );
  }

  return (
    <>
      <PaginaCuentas lineas={lineas} generadoPor={generadoPor} />
      <PaginaVencimientos lineas={lineas} generadoPor={generadoPor} />
    </>
  );
}
