/**
 * Genera mockups B/N (SVG) y PDF de codificación para FarmaMuni.
 * Ejecutar: node DOCS/generate-docs.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { jsPDF } from "jspdf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MOCKUPS_DIR = path.join(__dirname, "mockups");
const PDF_PATH = path.join(__dirname, "FarmaMuni-Codificacion.pdf");

const MOCKUPS = [
  { n: 1, file: "01-login", title: "Inicio de sesión", layout: "auth", hint: "Correo · contraseña · acceso" },
  { n: 2, file: "02-home", title: "Panel principal FarmaMuni", layout: "dashboard", hint: "Módulos del sistema" },
  { n: 3, file: "03-inventario-lista", title: "Inventario — listado", layout: "table", hint: "Productos · lotes · filtros" },
  { n: 4, file: "04-inventario-nuevo", title: "Inventario — nuevo producto", layout: "form", hint: "Alta de medicamento" },
  { n: 5, file: "05-inventario-editar", title: "Inventario — editar producto", layout: "form", hint: "Lotes y ubicación" },
  { n: 6, file: "06-ventas-pos", title: "Ventas — punto de venta", layout: "pos", hint: "Carrito · cliente · cobro" },
  { n: 7, file: "07-ventas-historial", title: "Ventas — historial", layout: "tabs", hint: "Filtros fecha · tipo pago" },
  { n: 8, file: "08-clientes-lista", title: "Clientes — directorio", layout: "table", hint: "Búsqueda · exportar" },
  { n: 9, file: "09-clientes-detalle", title: "Clientes — ficha e historial", layout: "split", hint: "Panel 70/30" },
  { n: 10, file: "10-clientes-formulario", title: "Clientes — crear / editar", layout: "modal", hint: "ModalShell SIGET" },
  { n: 11, file: "11-compras-registrar", title: "Compras — registrar compra", layout: "pos", hint: "Productos · carrito compra" },
  { n: 12, file: "12-compras-proveedores", title: "Compras — catálogo proveedores", layout: "table", hint: "Proveedores autorizados" },
  { n: 13, file: "13-compras-historial", title: "Compras — historial global", layout: "tabs", hint: "Filtros calendario" },
  { n: 14, file: "14-compras-por-pagar", title: "Compras — cuentas por pagar", layout: "table", hint: "Saldos pendientes" },
  { n: 15, file: "15-proveedor-detalle", title: "Proveedor — detalle e historial", layout: "split", hint: "Gráfica · estadísticas" },
  { n: 16, file: "16-creditos-cobrar", title: "Créditos — por cobrar", layout: "table", hint: "Saldos clientes" },
  { n: 17, file: "17-creditos-pagados", title: "Créditos — pagados", layout: "table", hint: "Historial abonos" },
  { n: 18, file: "18-finanzas", title: "Finanzas — control financiero", layout: "tabs", hint: "Ingresos · egresos · balance" },
  { n: 19, file: "19-finanzas-movimiento", title: "Finanzas — ingreso / egreso", layout: "modal", hint: "Registro manual" },
  { n: 20, file: "20-admin-usuarios", title: "Administración — usuarios", layout: "table", hint: "Roles y permisos" },
  { n: 21, file: "21-admin-config", title: "Administración — configuraciones", layout: "form", hint: "Parámetros farmacia" },
  { n: 22, file: "22-admin-dispositivos", title: "Administración — dispositivos", layout: "table", hint: "Passkeys · sesiones" },
  { n: 23, file: "23-signup", title: "Registro de farmacia", layout: "auth", hint: "Alta inicial" },
  { n: 24, file: "24-perfil", title: "Perfil de usuario", layout: "modal", hint: "Datos de cuenta" },
  { n: 25, file: "25-sin-acceso", title: "Acceso restringido", layout: "auth", hint: "Esperando autorización" },
];

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wireRect(x, y, w, h, stroke = 1.5, fill = "none") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="black" stroke-width="${stroke}"/>`;
}

function wireText(x, y, text, size = 12, bold = false) {
  const w = bold ? "bold" : "normal";
  return `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${w}" fill="black">${esc(text)}</text>`;
}

function layoutBlocks(layout) {
  const blocks = [];
  const W = 760;
  const baseY = 100;
  switch (layout) {
    case "auth":
      blocks.push(wireRect(230, 160, 340, 320));
      blocks.push(wireRect(260, 210, 280, 36));
      blocks.push(wireRect(260, 270, 280, 36));
      blocks.push(wireRect(300, 400, 200, 40, 2, "#e8e8e8"));
      break;
    case "dashboard":
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          const w = col === 0 && row === 0 ? 320 : 200;
          const h = col === 0 && row === 0 ? 200 : 90;
          blocks.push(wireRect(20 + col * 250, baseY + row * 110, w, h));
        }
      }
      break;
    case "table":
      blocks.push(wireRect(20, baseY, W, 44));
      blocks.push(wireRect(20, baseY + 54, W, 380));
      for (let i = 0; i < 8; i++) {
        blocks.push(`<line x1="20" y1="${baseY + 54 + i * 48}" x2="780" y2="${baseY + 54 + i * 48}" stroke="black" stroke-width="1"/>`);
      }
      break;
    case "form":
      for (let i = 0; i < 6; i++) {
        blocks.push(wireText(40, baseY + 20 + i * 56, "Campo " + (i + 1), 10));
        blocks.push(wireRect(40, baseY + 28 + i * 56, 520, 32));
      }
      blocks.push(wireRect(560, baseY + 300, 160, 40, 2, "#ddd"));
      break;
    case "split":
      blocks.push(wireRect(20, baseY, 500, 420));
      blocks.push(wireRect(90, baseY + 30, 360, 120));
      blocks.push(wireRect(540, baseY, 220, 420));
      for (let i = 0; i < 4; i++) {
        blocks.push(wireRect(560, baseY + 40 + i * 70, 180, 50));
      }
      break;
    case "pos":
      blocks.push(wireRect(20, baseY, 480, 420));
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          blocks.push(wireRect(35 + c * 155, baseY + 20 + r * 120, 140, 100));
        }
      }
      blocks.push(wireRect(520, baseY, 240, 420));
      blocks.push(wireRect(540, baseY + 320, 200, 44, 2, "#ddd"));
      break;
    case "tabs":
      blocks.push(wireRect(20, baseY - 10, 400, 40));
      blocks.push(wireRect(20, baseY + 40, W, 400));
      blocks.push(wireRect(40, baseY + 60, 720, 140));
      break;
    case "modal":
      blocks.push(`<rect x="0" y="0" width="800" height="600" fill="black" opacity="0.08"/>`);
      blocks.push(wireRect(120, 80, 560, 440));
      for (let i = 0; i < 5; i++) {
        blocks.push(wireRect(150, 130 + i * 58, 500, 32));
      }
      blocks.push(wireRect(420, 460, 120, 36, 2, "#ddd"));
      break;
    case "admin":
      blocks.push(wireRect(20, baseY, W, 400));
      break;
    default:
      blocks.push(wireRect(20, baseY, W, 400));
  }
  return blocks.join("\n");
}

function buildMockupSvg(m) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="white"/>
  ${wireRect(0, 0, 800, 56, 2)}
  ${wireText(24, 36, "FarmaMuni (KoreAPP)", 16, true)}
  ${wireText(620, 36, "Mockup " + String(m.n).padStart(2, "0"), 11)}
  ${wireText(40, 78, m.title, 18, true)}
  ${wireText(40, 96, m.hint, 11)}
  ${layoutBlocks(m.layout)}
  ${wireText(40, 575, "Wireframe B/N — solo referencia de interfaz", 9)}
</svg>`;
}

function readSnippet(relPath, startLine, endLine) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return `// Archivo no encontrado: ${relPath}`;
  const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
  return lines.slice(startLine - 1, endLine).join("\n");
}

const CODE_SECTIONS = [
  {
    id: "5.1.1",
    title: "Registro de módulos de negocio (APP_MODULES)",
    file: "src/lib/app-modules.ts",
    start: 18,
    end: 57,
    caption: "Figura 1. Configuración declarativa de módulos FarmaMuni",
    body: [
      "El arreglo APP_MODULES centraliza rutas, roles permitidos y metadatos de tarjetas del panel principal.",
      "Cada objeto define href bajo /farmamuni, etiquetas visuales y restricciones allowedRoles para el menú lateral.",
      "Esta capa desacopla la navegación de los componentes de página y facilita agregar módulos sin duplicar lógica.",
    ],
  },
  {
    id: "5.1.2",
    title: "Server Action — consulta de inventario",
    file: "src/components/(base)/inventario/lib/actions.ts",
    start: 37,
    end: 72,
    caption: "Figura 2. Obtención segura de productos con Supabase",
    body: [
      "Las acciones de servidor validan sesión con supabase.auth.getUser() antes de leer datos.",
      "obtenerProductos realiza un select con relaciones a proveedores y detalles de compra.",
      "Los errores se normalizan a códigos controlados (UNAUTHORIZED, INTERNAL) para el cliente.",
    ],
  },
  {
    id: "5.1.3",
    title: "Esquema Zod de producto",
    file: "src/components/(base)/inventario/lib/zod.ts",
    start: 1,
    end: 45,
    caption: "Figura 3. Validación de formularios de inventario",
    body: [
      "productSchema concentra tipos inferidos con z.infer; no se usan interfaces sueltas en el módulo.",
      "Los campos numéricos y fechas se validan antes de mutar en Supabase.",
      "safeParse en actions evita exponer errores crudos de base de datos al usuario.",
    ],
  },
  {
    id: "5.2.1",
    title: "Carga de productos y clientes para ventas",
    file: "src/components/(base)/ventas/lib/actions.ts",
    start: 28,
    end: 57,
    caption: "Figura 4. Agregación de catálogo en punto de venta",
    body: [
      "obtenerProductosYClientes une inv_productos activos y ven_clientes ordenados.",
      "El POS consume este endpoint vía TanStack Query en el cliente.",
      "Centralizar la carga reduce round-trips y mantiene consistencia de precios y stock.",
    ],
  },
  {
    id: "5.2.2",
    title: "Contexto global de ventas",
    file: "src/components/(base)/ventas/ContextoVentas.tsx",
    start: 120,
    end: 165,
    caption: "Figura 5. Estado del carrito y tipo de venta",
    body: [
      "ContextoVentas expone carrito, cliente seleccionado y tipo Contado/Crédito a toda la UI de ventas.",
      "El proveedor React evita prop drilling entre SeccionProductos, sidebar y modales.",
      "Las reglas de negocio (crédito requiere cliente) se aplican en el contexto antes de persistir.",
    ],
  },
  {
    id: "5.2.3",
    title: "Filtros de historial de ventas",
    file: "src/components/(base)/ventas/lib/helpers.ts",
    start: 131,
    end: 175,
    caption: "Figura 6. Normalización de tipo de pago en historial",
    body: [
      "fechaVentaCalendarioGt alinea fechas a zona America/Guatemala para filtros por día.",
      "ventaCoincideFiltroPagoHistorial clasifica contado/crédito ignorando mayúsculas y tildes.",
      "Esta capa pura facilita pruebas y evita duplicar condiciones en el componente de tabla.",
    ],
  },
  {
    id: "5.3.1",
    title: "Hooks de clientes (TanStack Query)",
    file: "src/components/(base)/clientes/lib/hooks.ts",
    start: 1,
    end: 55,
    caption: "Figura 7. Patrón de datos asíncronos en clientes",
    body: [
      "useClientes encapsula fetch, cache y revalidación con queryKey estable.",
      "El modo demo intercambia fixtures locales sin cambiar la UI.",
      "Los componentes VerClientes solo consumen hooks; no llaman Supabase directamente.",
    ],
  },
  {
    id: "5.3.2",
    title: "Panel historial de compras del cliente",
    file: "src/components/(base)/clientes/VerClientes.tsx",
    start: 354,
    end: 395,
    caption: "Figura 8. Layout de overlay 70/30 en detalle de cliente",
    body: [
      "HistorialComprasPanel combina filtros de fecha, gráfica Recharts y listado filtrado.",
      "El motion.div aplica animación de entrada coherente con el design system SIGET.",
      "La estructura se reutilizó como referencia para el detalle de proveedores.",
    ],
  },
  {
    id: "5.4.1",
    title: "Creación de compra a proveedor",
    file: "src/components/(base)/proveedores/lib/actions.ts",
    start: 130,
    end: 185,
    caption: "Figura 9. Transacción de compra e inventario",
    body: [
      "crearCompra valida payload con Zod, inserta inv_compras y detalles, y actualiza stock por lote.",
      "revalidatePath mantiene sincronizadas las rutas de proveedores e inventario.",
      "Los pagos parciales generan fin_transacciones con categoría pago_proveedor.",
    ],
  },
  {
    id: "5.4.2",
    title: "Shell de pestañas de compras",
    file: "src/components/(base)/proveedores/VerProveedores.tsx",
    start: 16,
    end: 35,
    caption: "Figura 10. Navegación interna del módulo compras",
    body: [
      "COMPRAS_TABS define registrar, proveedores, historial y cuentas por pagar.",
      "El estado activeTab vive en el contenedor; cada pestaña monta su sección sin rutas hijas.",
      "Los estilos pill siguen el mismo patrón visual que créditos y finanzas.",
    ],
  },
  {
    id: "5.4.3",
    title: "Detalle de proveedor con historial integrado",
    file: "src/components/(base)/proveedores/forms/VerProveedor.tsx",
    start: 554,
    end: 598,
    caption: "Figura 11. Overlay fijo y panel dividido",
    body: [
      "VerProveedor abandona ModalShell estrecho por layout full-screen alineado a clientes.",
      "useComprasProveedor carga historial vía server action autenticada.",
      "En móvil el historial se abre en capa superior con AnimatePresence.",
    ],
  },
  {
    id: "5.5.1",
    title: "Resumen financiero en servidor",
    file: "src/components/(base)/finanzas/lib/actions.ts",
    start: 1,
    end: 80,
    caption: "Figura 12. Agregación de ingresos y egresos",
    body: [
      "Las finanzas calculan totales desde fin_transacciones con filtros de fecha en SQL o post-proceso.",
      "Se distinguen movimientos ligados a ventas, compras y gastos fijos.",
      "El cliente solo renderiza KPIs; la lógica sensible permanece en el servidor.",
    ],
  },
  {
    id: "5.5.2",
    title: "UI de control financiero",
    file: "src/components/(base)/finanzas/VerFinanzas.tsx",
    start: 229,
    end: 275,
    caption: "Figura 13. Encabezado y tarjetas de balance",
    body: [
      "moduleListPageShellClass reduce padding superior para alinear con otros módulos.",
      "CustomDatePicker reemplaza entrada manual en filtros Día y Rango.",
      "SigetActionButton dispara modales de ingreso y egreso con el tema SIGET.",
    ],
  },
  {
    id: "5.6.1",
    title: "Créditos — consulta de ventas a crédito",
    file: "src/components/(base)/creditos/lib/actions.ts",
    start: 1,
    end: 50,
    caption: "Figura 14. Listado de cartera por cobrar",
    body: [
      "Las acciones filtran ven_ventas con tipo_venta Crédito y calculan saldos con abonos.",
      "Los resultados alimentan tablas paginadas en VerCreditos.",
      "RLS en Supabase limita filas según el tenant de la farmacia.",
    ],
  },
  {
    id: "5.7.1",
    title: "Layout compartido de módulos",
    file: "src/lib/module-layout.ts",
    start: 1,
    end: 57,
    caption: "Figura 15. Clases Tailwind reutilizables",
    body: [
      "modulePageShellClass y moduleListPageShellClass estandarizan márgenes y max-width.",
      "moduleControlsShellClass envuelve barras de filtros con borde y sombra SIGET.",
      "Centralizar clases evita drift visual entre inventario, ventas y finanzas.",
    ],
  },
  {
    id: "5.7.2",
    title: "Modal SIGET (ModalShell)",
    file: "src/components/ui/general-modal.tsx",
    start: 1,
    end: 55,
    caption: "Figura 16. Componente base de formularios flotantes",
    body: [
      "ModalShell unifica header, footer y campos ModalInput/ModalFechaInput.",
      "modalAccentClass aplica color institucional Trifinio en títulos y labels.",
      "Prohibido usar Dialog shadcn en formularios nuevos según reglas del proyecto.",
    ],
  },
  {
    id: "5.7.3",
    title: "Fechas en zona horaria Guatemala",
    file: "src/lib/fechas-gt.ts",
    start: 1,
    end: 35,
    caption: "Figura 17. Utilidad fechaCalendarioGt",
    body: [
      "TIMEZONE_GT fija America/Guatemala para todos los filtros por día.",
      "fechaCalendarioGt formatea con en-CA (YYYY-MM-DD) independiente del locale del navegador.",
      "normalizarFechaCalendario sanea strings ISO antes de comparar en filtros.",
    ],
  },
  {
    id: "5.8.1",
    title: "Enrutamiento App Router",
    file: "src/app/farmamuni/ventas/page.tsx",
    start: 1,
    end: 25,
    caption: "Figura 18. Página delgada con Suspense",
    body: [
      "Las rutas bajo src/app/farmamuni importan un único componente de dominio.",
      "page.tsx no contiene lógica de negocio; solo composición y loading boundaries.",
      "Este patrón se repite en clientes, inventario, proveedores y finanzas.",
    ],
  },
];

function wrapText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function buildPdf() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - margin * 2;
  let fig = 0;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("FarmaMuni (KoreAPP) — Documentación de codificación", margin, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  wrapText(
    doc,
    "Capítulo 5. Fragmentos de código relevantes del sistema de gestión farmacéutica municipal. Stack: Next.js App Router, TypeScript, Supabase, TanStack Query, Zod, Tailwind SIGET.",
    margin,
    32,
    contentW,
    5,
  );

  for (const section of CODE_SECTIONS) {
    fig += 1;
    doc.addPage();
    let y = 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${section.id} ${section.title}`, margin, y);
    y += 8;

    const code = readSnippet(section.file, section.start, section.end);
    const codeLines = code.split("\n");
    const maxLines = 28;
    const shown = codeLines.slice(0, maxLines).join("\n");
    const boxH = Math.min(95, 8 + codeLines.length * 3.2);
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(margin, y, contentW, boxH);
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    const codeWrapped = doc.splitTextToSize(shown, contentW - 4);
    doc.text(codeWrapped, margin + 2, y + 5);
    y += boxH + 4;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    y = wrapText(doc, section.caption, margin, y, contentW, 4.5);
    y += 3;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const para of section.body) {
      y = wrapText(doc, para, margin, y, contentW, 5);
      y += 2;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Fuente: ${section.file} (L${section.start}–${section.end})`, margin, 285);
    doc.setTextColor(0);
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(String(i), pageW / 2, 290, { align: "center" });
  }

  fs.writeFileSync(PDF_PATH, Buffer.from(doc.output("arraybuffer")));
  console.log("PDF:", PDF_PATH, "páginas:", totalPages);
}

function buildMockups() {
  fs.mkdirSync(MOCKUPS_DIR, { recursive: true });
  for (const m of MOCKUPS) {
    const out = path.join(MOCKUPS_DIR, `${m.file}.svg`);
    fs.writeFileSync(out, buildMockupSvg(m), "utf8");
  }
  console.log("Mockups:", MOCKUPS.length, "en", MOCKUPS_DIR);
}

buildMockups();
buildPdf();
console.log("Documentación generada en DOCS/");
