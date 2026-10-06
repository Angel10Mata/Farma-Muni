"use client";

import { createRoot, type Root } from "react-dom/client";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import type { CuentaPorCobrar } from "@/components/(base)/finanzas/lib/zod";
import { enriquecerLineasCuentas } from "./creditos-reporte-helpers";
import { ReporteCreditosVistaExport } from "./ReporteCreditosVistaExport";

export type ReporteCreditosPdfInput = {
  cuentas: CuentaPorCobrar[];
  generadoPor: string;
};

async function capturarPaginas(host: HTMLElement): Promise<string[]> {
  const pages = Array.from(
    host.querySelectorAll<HTMLElement>("[data-reporte-page]"),
  );
  const urls: string[] = [];
  for (const page of pages) {
    const dataUrl = await toPng(page, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });
    urls.push(dataUrl);
  }
  return urls;
}

export async function descargarReporteCreditosPdf(
  input: ReporteCreditosPdfInput,
) {
  const lineas = enriquecerLineasCuentas(input.cuentas);
  const generadoPor = input.generadoPor.trim() || "Usuario";

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "-12000px",
    top: "0",
    zIndex: "-1",
    pointerEvents: "none",
  });
  document.body.appendChild(host);

  const root: Root = createRoot(host);
  try {
    await new Promise<void>((resolve) => {
      root.render(
        <ReporteCreditosVistaExport
          lineas={lineas}
          generadoPor={generadoPor}
          onReady={() => resolve()}
        />,
      );
    });

    const imagenes = await capturarPaginas(host);
    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
      compress: true,
    });

    imagenes.forEach((img, index) => {
      if (index > 0) doc.addPage();
      doc.addImage(img, "PNG", 0, 0, 210, 297);
    });

    const blob = doc.output("blob");
    const clave = new Date().toISOString().slice(0, 10);
    saveAs(blob, `Reporte_Creditos_${clave}.pdf`);
  } finally {
    root.unmount();
    host.remove();
  }
}
