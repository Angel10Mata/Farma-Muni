import type { Cliente } from "@/components/(base)/clientes/lib/zod";
import type { CreditoResumen, VentaCreditoDetalle } from "@/components/(base)/creditos/lib/zod";
import type {
  CuentaPorCobrar,
  CuentaPorPagar,
  ResumenFinanciero,
  TransaccionFinanciera,
} from "@/components/(base)/finanzas/lib/zod";
import type { Producto } from "@/components/(base)/inventario/lib/zod";
import type { Compra, Proveedor } from "@/components/(base)/proveedores/lib/zod";

const now = new Date();
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 86400000).toISOString();

const pad = (n: number, len = 3) => String(n).padStart(len, "0");

const NOMBRES = [
  "María López", "Juan Carlos Méndez", "Ana Patricia Ruiz", "Roberto García",
  "Clínica San José", "Farmacia El Progreso S.A.", "Droguería La Esperanza",
  "Hospital Roosevelt", "Carmen Elena Vásquez", "Luis Fernando Morales",
  "Centro Médico Integral", "Farmacia San Miguel", "Pedro Antonio Sánchez",
  "Distribuidora Médica Z.12", "Clínica Familiar Mixco", "Elena María Castillo",
  "Cooperativa Salud GT", "Óscar René Hernández", "Botica Central", "Laura Isabel Pérez",
  "Farmacia Villa Nueva", "Mario Alberto Reyes", "Clínica Santa Lucía",
  "Droguería El Ángel", "Gabriela Morales", "Instituto Guatemalteco de Seguridad Social",
  "Farmacia La Unión", "Ricardo Enrique Flores", "Botica San Juan", "Sandra Lucía Ortiz",
];

const PRODUCTOS_CATALOGO: Array<{
  codigo: string;
  nombre: string;
  desc: string;
  precio: number;
  costo: number;
  stock: number;
  minimo: number;
  ubicacion: string;
  provIdx: number;
}> = [
  { codigo: "PARA-500", nombre: "Paracetamol 500 mg", desc: "Caja x 20 tabletas", precio: 18.5, costo: 12, stock: 45, minimo: 20, ubicacion: "Estante A1", provIdx: 0 },
  { codigo: "IBU-400", nombre: "Ibuprofeno 400 mg", desc: "Caja x 10 tabletas", precio: 22, costo: 14.5, stock: 8, minimo: 15, ubicacion: "Estante A2", provIdx: 1 },
  { codigo: "AMOX-500", nombre: "Amoxicilina 500 mg", desc: "Cápsulas x 15", precio: 35, costo: 24, stock: 3, minimo: 10, ubicacion: "Refrigerado B1", provIdx: 1 },
  { codigo: "VIT-C-1000", nombre: "Vitamina C 1000 mg", desc: "Efervescentes x 10", precio: 28, costo: 18, stock: 60, minimo: 12, ubicacion: "Estante C3", provIdx: 0 },
  { codigo: "LOS-50", nombre: "Losartán 50 mg", desc: "Caja x 30 tabletas", precio: 42, costo: 28, stock: 22, minimo: 10, ubicacion: "Estante A3", provIdx: 2 },
  { codigo: "MET-850", nombre: "Metformina 850 mg", desc: "Caja x 30 tabletas", precio: 38, costo: 22, stock: 5, minimo: 12, ubicacion: "Estante A4", provIdx: 2 },
  { codigo: "OME-20", nombre: "Omeprazol 20 mg", desc: "Cápsulas x 14", precio: 32, costo: 19, stock: 38, minimo: 15, ubicacion: "Estante B1", provIdx: 0 },
  { codigo: "CET-10", nombre: "Cetirizina 10 mg", desc: "Caja x 10 tabletas", precio: 24, costo: 14, stock: 52, minimo: 10, ubicacion: "Estante B2", provIdx: 3 },
  { codigo: "SALB-100", nombre: "Salbutamol inhalador", desc: "100 mcg x 200 dosis", precio: 85, costo: 58, stock: 7, minimo: 8, ubicacion: "Mostrador", provIdx: 4 },
  { codigo: "INS-NPH", nombre: "Insulina NPH", desc: "Frasco 10 ml", precio: 145, costo: 98, stock: 4, minimo: 6, ubicacion: "Refrigerado B2", provIdx: 4 },
  { codigo: "DEX-4", nombre: "Dexametasona 4 mg", desc: "Caja x 20 tabletas", precio: 26, costo: 16, stock: 18, minimo: 10, ubicacion: "Estante B3", provIdx: 1 },
  { codigo: "AZI-500", nombre: "Azitromicina 500 mg", desc: "Caja x 3 tabletas", precio: 48, costo: 32, stock: 2, minimo: 8, ubicacion: "Refrigerado B1", provIdx: 1 },
  { codigo: "DIC-75", nombre: "Diclofenaco 75 mg", desc: "Ampollas x 5", precio: 55, costo: 36, stock: 14, minimo: 8, ubicacion: "Estante C1", provIdx: 3 },
  { codigo: "RAN-150", nombre: "Ranitidina 150 mg", desc: "Caja x 20 tabletas", precio: 28, costo: 17, stock: 9, minimo: 12, ubicacion: "Estante C2", provIdx: 0 },
  { codigo: "ATV-20", nombre: "Atorvastatina 20 mg", desc: "Caja x 30 tabletas", precio: 62, costo: 42, stock: 16, minimo: 10, ubicacion: "Estante A5", provIdx: 2 },
  { codigo: "AML-5", nombre: "Amlodipino 5 mg", desc: "Caja x 30 tabletas", precio: 36, costo: 24, stock: 25, minimo: 10, ubicacion: "Estante A6", provIdx: 2 },
  { codigo: "CAP-500", nombre: "Captopril 25 mg", desc: "Caja x 30 tabletas", precio: 30, costo: 19, stock: 11, minimo: 10, ubicacion: "Estante B4", provIdx: 5 },
  { codigo: "FUR-40", nombre: "Furosemida 40 mg", desc: "Caja x 20 tabletas", precio: 22, costo: 13, stock: 6, minimo: 10, ubicacion: "Estante B5", provIdx: 5 },
  { codigo: "CLOR-250", nombre: "Cloranfenicol gotas", desc: "Frasco 15 ml", precio: 18, costo: 11, stock: 33, minimo: 8, ubicacion: "Mostrador", provIdx: 3 },
  { codigo: "ALG-500", nombre: "Alginato de sodio", desc: "Sobre x 20", precio: 45, costo: 28, stock: 19, minimo: 8, ubicacion: "Estante C4", provIdx: 0 },
  { codigo: "GUA-200", nombre: "Guayusa extracto", desc: "Frasco 60 ml", precio: 52, costo: 34, stock: 28, minimo: 6, ubicacion: "Estante D1", provIdx: 6 },
  { codigo: "PRO-500", nombre: "Protector solar FPS 50", desc: "Tubo 120 ml", precio: 78, costo: 48, stock: 15, minimo: 5, ubicacion: "Estante D2", provIdx: 6 },
  { codigo: "ALC-70", nombre: "Alcohol gel 70%", desc: "Frasco 500 ml", precio: 15, costo: 8, stock: 80, minimo: 20, ubicacion: "Mostrador", provIdx: 7 },
  { codigo: "JAB-ANT", nombre: "Jabón antibacterial", desc: "Barra 90 g", precio: 12, costo: 6, stock: 55, minimo: 15, ubicacion: "Mostrador", provIdx: 7 },
  { codigo: "CUR-10", nombre: "Curitas adhesivas", desc: "Caja x 20", precio: 14, costo: 7, stock: 42, minimo: 10, ubicacion: "Mostrador", provIdx: 7 },
  { codigo: "VEND-5", nombre: "Venda elástica 5 cm", desc: "Rollo 5 m", precio: 22, costo: 12, stock: 24, minimo: 8, ubicacion: "Estante D3", provIdx: 7 },
  { codigo: "GAS-10", nombre: "Gasas estériles", desc: "Paquete x 10", precio: 16, costo: 9, stock: 36, minimo: 12, ubicacion: "Estante D3", provIdx: 7 },
  { codigo: "JER-5", nombre: "Jeringa 5 ml", desc: "Caja x 100", precio: 35, costo: 22, stock: 12, minimo: 5, ubicacion: "Estante D4", provIdx: 7 },
  { codigo: "TERM-DIG", nombre: "Termómetro digital", desc: "Unidad", precio: 65, costo: 38, stock: 8, minimo: 3, ubicacion: "Mostrador", provIdx: 6 },
  { codigo: "TENS-OM", nombre: "Tensiómetro digital", desc: "Brazo automático", precio: 285, costo: 195, stock: 3, minimo: 2, ubicacion: "Mostrador", provIdx: 6 },
  { codigo: "NEB-USB", nombre: "Nebulizador portátil", desc: "Con mascarilla", precio: 420, costo: 290, stock: 2, minimo: 2, ubicacion: "Mostrador", provIdx: 4 },
  { codigo: "BIS-400", nombre: "Bismuto subsalicilato", desc: "Frasco 240 ml", precio: 38, costo: 24, stock: 17, minimo: 8, ubicacion: "Estante C5", provIdx: 0 },
  { codigo: "LOP-2", nombre: "Loperamida 2 mg", desc: "Caja x 12 cápsulas", precio: 28, costo: 17, stock: 21, minimo: 8, ubicacion: "Estante C5", provIdx: 0 },
  { codigo: "HID-1000", nombre: "Hidróxido de aluminio", desc: "Frasco 360 ml", precio: 24, costo: 14, stock: 29, minimo: 10, ubicacion: "Estante B6", provIdx: 3 },
  { codigo: "SIM-40", nombre: "Simvastatina 40 mg", desc: "Caja x 30 tabletas", precio: 58, costo: 38, stock: 13, minimo: 8, ubicacion: "Estante A7", provIdx: 2 },
  { codigo: "ENAL-10", nombre: "Enalapril 10 mg", desc: "Caja x 30 tabletas", precio: 34, costo: 21, stock: 10, minimo: 10, ubicacion: "Estante A8", provIdx: 5 },
  { codigo: "GLI-5", nombre: "Glibenclamida 5 mg", desc: "Caja x 30 tabletas", precio: 26, costo: 15, stock: 7, minimo: 10, ubicacion: "Estante A4", provIdx: 2 },
  { codigo: "LEV-500", nombre: "Levotiroxina 50 mcg", desc: "Caja x 50 tabletas", precio: 72, costo: 48, stock: 5, minimo: 8, ubicacion: "Refrigerado B3", provIdx: 4 },
  { codigo: "PRED-5", nombre: "Prednisona 5 mg", desc: "Caja x 20 tabletas", precio: 22, costo: 13, stock: 14, minimo: 8, ubicacion: "Estante B7", provIdx: 1 },
  { codigo: "CIP-500", nombre: "Ciprofloxacino 500 mg", desc: "Caja x 14 tabletas", precio: 52, costo: 35, stock: 4, minimo: 8, ubicacion: "Refrigerado B1", provIdx: 1 },
  { codigo: "FLU-150", nombre: "Fluconazol 150 mg", desc: "Cápsula x 1", precio: 45, costo: 28, stock: 18, minimo: 6, ubicacion: "Estante C6", provIdx: 1 },
  { codigo: "KET-2", nombre: "Ketoconazol crema 2%", desc: "Tubo 30 g", precio: 32, costo: 19, stock: 22, minimo: 6, ubicacion: "Estante D5", provIdx: 3 },
  { codigo: "MUL-VIT", nombre: "Multivitamínico adulto", desc: "Frasco x 60 cápsulas", precio: 68, costo: 42, stock: 26, minimo: 8, ubicacion: "Estante C7", provIdx: 0 },
  { codigo: "CAL-D3", nombre: "Calcio + Vitamina D3", desc: "Frasco x 60 tabletas", precio: 55, costo: 34, stock: 31, minimo: 10, ubicacion: "Estante C7", provIdx: 0 },
  { codigo: "HIER-100", nombre: "Hierro + ácido fólico", desc: "Caja x 30 tabletas", precio: 38, costo: 23, stock: 19, minimo: 8, ubicacion: "Estante C8", provIdx: 0 },
  { codigo: "PROB-10", nombre: "Probiótico 10 mil millones", desc: "Caja x 10 sobres", precio: 95, costo: 62, stock: 11, minimo: 5, ubicacion: "Refrigerado B4", provIdx: 4 },
  { codigo: "COL-500", nombre: "Colágeno hidrolizado", desc: "Frasco 300 g", precio: 125, costo: 78, stock: 9, minimo: 4, ubicacion: "Estante D6", provIdx: 6 },
  { codigo: "PAÑ-AD", nombre: "Pañales adulto talla L", desc: "Paquete x 10", precio: 48, costo: 30, stock: 34, minimo: 12, ubicacion: "Estante E1", provIdx: 7 },
  { codigo: "PAÑ-NIN", nombre: "Pañales bebé talla 4", desc: "Paquete x 40", precio: 72, costo: 48, stock: 27, minimo: 10, ubicacion: "Estante E1", provIdx: 7 },
  { codigo: "TOA-HUM", nombre: "Toallitas húmedas", desc: "Paquete x 80", precio: 28, costo: 16, stock: 44, minimo: 12, ubicacion: "Estante E2", provIdx: 7 },
];

const PROVEEDORES_DATA = [
  { nombre: "Distribuidora Médica GT", desc: "Medicamentos genéricos y de marca", nit: "1234567-8", tel: "50255501001", correo: "ventas@medgt.demo" },
  { nombre: "Laboratorios Centroamérica", desc: "Analgésicos y antibióticos", nit: "9876543-1", tel: "50255501002", correo: "pedidos@labca.demo" },
  { nombre: "Pharma Express S.A.", desc: "Cardiovascular y diabetes", nit: "4455667-2", tel: "50255501003", correo: "ventas@pharmaexp.demo" },
  { nombre: "Droguería Nacional", desc: "Surtido general", nit: "7788990-3", tel: "50255501004", correo: "compras@drognac.demo" },
  { nombre: "BioSalud Guatemala", desc: "Refrigerados e insulinas", nit: "3344556-4", tel: "50255501005", correo: "frio@biosalud.demo" },
  { nombre: "MediCorp Distribución", desc: "Genéricos hospitalarios", nit: "2233445-5", tel: "50255501006", correo: "hospital@medicorp.demo" },
  { nombre: "Cosmética y Bienestar GT", desc: "Dermocosmética y vitaminas", nit: "1122334-6", tel: "50255501007", correo: "belleza@cosmetgt.demo" },
  { nombre: "Insumos Médicos Unidos", desc: "Material de curación", nit: "6677889-7", tel: "50255501008", correo: "insumos@medunidos.demo" },
];

export const DEMO_PROVEEDORES: Proveedor[] = PROVEEDORES_DATA.map((p, i) => ({
  id: `demo-prov-${pad(i + 1)}`,
  nombre: p.nombre,
  descripcion: p.desc,
  nit: p.nit,
  telefono: p.tel,
  correo: p.correo,
}));

export const DEMO_PRODUCTOS: Producto[] = PRODUCTOS_CATALOGO.map((p, i) => {
  const prov = DEMO_PROVEEDORES[p.provIdx] ?? DEMO_PROVEEDORES[0];
  const venceYear = 2026 + (i % 3);
  const venceMonth = String((i % 12) + 1).padStart(2, "0");
  return {
    id: `demo-prod-${pad(i + 1)}`,
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.desc,
    precio_base: p.precio,
    precio_costo: p.costo,
    stock_actual: p.stock,
    stock_minimo: p.minimo,
    activo: true,
    proveedor_id: prov.id,
    inv_proveedores: { nombre: prov.nombre },
    created_at: daysAgo(30 - (i % 25)),
    imagen_url: null,
    fecha_vencimiento: `${venceYear}-${venceMonth}-28`,
    numero_lote: `L-${2400 + i}`,
    ubicacion: p.ubicacion,
  };
});

export const DEMO_LOW_STOCK_COUNT = DEMO_PRODUCTOS.filter(
  (p) => p.stock_actual <= p.stock_minimo,
).length;

export const DEMO_UBICACIONES = [
  ...new Set(DEMO_PRODUCTOS.map((p) => p.ubicacion).filter(Boolean) as string[]),
];

export const DEMO_CLIENTES_DB = NOMBRES.map((nombre, i) => ({
  id: `demo-cli-${pad(i + 1)}`,
  nombre,
  email: i % 4 === 0 ? "" : `${nombre.split(" ")[0].toLowerCase()}@demo.com`,
  telefono: `5025550${pad(2000 + i, 4)}`,
  direccion: ["Zona 10, Ciudad de Guatemala", "Mixco", "Antigua Guatemala", "Villa Nueva", "Zone 11"][i % 5],
  nit: i % 3 === 0 ? `${1000000 + i * 111}-${i % 10}` : "C/F",
  activo: true,
}));

export const DEMO_CLIENTES: Cliente[] = DEMO_CLIENTES_DB.map((c, i) => ({
  id: c.id,
  nombre: c.nombre,
  email: c.email || "No registrado",
  telefono: c.telefono,
  direccion: c.direccion,
  nit: c.nit,
  totalCompras: 3 + (i * 7) % 45,
  ultimaCompra: daysAgo(i % 30),
  saldo: 0,
  creditosPendientes: i % 5 === 0 ? 1 + (i % 3) : i % 7 === 0 ? 1 : 0,
  activo: true,
}));

const CAJEROS = ["Angel Mata", "Cajero Demo", "María Cajera", "Admin Sistema"];

export const DEMO_VENTAS_HISTORIAL = Array.from({ length: 55 }, (_, i) => {
  const cliente = DEMO_CLIENTES_DB[i % DEMO_CLIENTES_DB.length];
  const esCredito = i % 4 === 0;
  const total = Math.round((15 + (i * 17.3) % 480) * 100) / 100;
  return {
    id: `demo-venta-${pad(i + 1)}`,
    created_at: daysAgo(i % 45),
    tipo_venta: esCredito ? "credito" : "contado",
    total,
    observaciones: i % 6 === 0 ? "Cliente frecuente" : i % 9 === 0 ? "Entrega a domicilio" : null,
    cliente_id: cliente.id,
    usuario_id: "demo-user",
    anulada: i === 50,
    ven_clientes: { nombre: cliente.nombre, nit: cliente.nit },
    profiles: { nombre: CAJEROS[i % CAJEROS.length] },
  };
});

export const DEMO_VENTA_DETALLE = DEMO_VENTAS_HISTORIAL.flatMap((venta, vi) => {
  const numItems = 1 + (vi % 4);
  return Array.from({ length: numItems }, (_, j) => {
    const prod = DEMO_PRODUCTOS[(vi + j) % DEMO_PRODUCTOS.length];
    const cantidad = 1 + ((vi + j) % 5);
    const precio = prod.precio_base;
    return {
      id: `demo-det-${pad(vi * 4 + j + 1, 4)}`,
      venta_id: venta.id,
      producto_id: prod.id,
      cantidad,
      precio_aplicado: precio,
      subtotal: Math.round(cantidad * precio * 100) / 100,
      inv_productos: { nombre: prod.nombre, codigo: prod.codigo },
    };
  });
});

export const DEMO_VENTAS_CLIENTE = DEMO_VENTAS_HISTORIAL.slice(0, 8).map((v) => ({
  id: v.id,
  created_at: v.created_at,
  tipo_venta: v.tipo_venta,
  total: v.total,
  observaciones: v.observaciones,
  fin_transacciones: [] as {
    id: string;
    monto: number;
    fecha_movimiento: string;
    tipo_movimiento: string;
    categoria: string;
  }[],
}));

export const DEMO_COMPRAS: Compra[] = Array.from({ length: 28 }, (_, i) => {
  const prov = DEMO_PROVEEDORES[i % DEMO_PROVEEDORES.length];
  const pagado = i % 3 !== 0;
  return {
    id: `demo-compra-${pad(i + 1)}`,
    created_at: daysAgo(i % 40),
    proveedor_id: prov.id,
    total: Math.round((400 + (i * 127.5) % 3500) * 100) / 100,
    estado_pago: pagado ? "Pagado" : "Pendiente",
    fecha_pago: pagado ? daysAgo(Math.max(0, (i % 40) - 2)) : null,
    observaciones: i % 4 === 0 ? "Pedido mensual" : i % 5 === 0 ? "Urgente" : null,
    fin_transacciones: [],
    inv_proveedores: { nombre: prov.nombre, nit: prov.nit ?? null },
  };
});

export const DEMO_COMPRA_DETALLE = DEMO_COMPRAS.flatMap((compra, ci) => {
  const numItems = 2 + (ci % 3);
  return Array.from({ length: numItems }, (_, j) => {
    const prod = DEMO_PRODUCTOS[(ci + j) % DEMO_PRODUCTOS.length];
    const cantidad = 10 + ((ci + j) * 3) % 80;
    const costo = prod.precio_costo ?? prod.precio_base * 0.65;
    return {
      id: `demo-compra-det-${pad(ci * 4 + j + 1, 4)}`,
      compra_id: compra.id,
      producto_id: prod.id,
      cantidad,
      precio_costo: costo,
      subtotal: Math.round(cantidad * costo * 100) / 100,
      inv_productos: { nombre: prod.nombre, codigo: prod.codigo },
    };
  });
});

const FIN_CATEGORIAS_INGRESO = ["venta", "abono_cliente"] as const;
const FIN_CATEGORIAS_EGRESO = ["compra", "pago_proveedor", "gasto_fijo", "gasto_vario"] as const;

export const DEMO_FINANZAS_MOVIMIENTOS: TransaccionFinanciera[] = Array.from(
  { length: 42 },
  (_, i) => {
    const esIngreso = i % 3 !== 2;
    const monto = Math.round((50 + (i * 89.7) % 4200) * 100) / 100;
    const saldoBase = 15000 - i * 180;
    return {
      id: `demo-fin-${pad(i + 1)}`,
      created_at: daysAgo(i % 35),
      fecha_movimiento: daysAgo(i % 35),
      tipo_movimiento: esIngreso ? "ingreso" : "egreso",
      categoria: esIngreso
        ? FIN_CATEGORIAS_INGRESO[i % FIN_CATEGORIAS_INGRESO.length]
        : FIN_CATEGORIAS_EGRESO[i % FIN_CATEGORIAS_EGRESO.length],
      descripcion: esIngreso
        ? [`Venta contado #${1000 + i}`, `Abono cliente ${NOMBRES[i % NOMBRES.length]}`, `Ingreso caja turno ${i % 3 + 1}`][i % 3]
        : [`Compra ${PROVEEDORES_DATA[i % PROVEEDORES_DATA.length].nombre}`, `Pago proveedor`, `Gasto ${["alquiler", "servicios", "papelería", "mantenimiento"][i % 4]}`][i % 3],
      monto,
      saldo_anterior: saldoBase + monto,
      saldo_nuevo: saldoBase,
      gasto_fijo_id: null,
      venta_id: esIngreso && i % 2 === 0 ? `demo-venta-${pad((i % 55) + 1)}` : null,
      compra_id: !esIngreso && i % 2 === 0 ? `demo-compra-${pad((i % 28) + 1)}` : null,
      usuario_id: "demo-user",
    };
  },
);

export const DEMO_RESUMEN_FINANCIERO: ResumenFinanciero = {
  total_ingresos: DEMO_FINANZAS_MOVIMIENTOS.filter((m) => m.tipo_movimiento === "ingreso").reduce((s, m) => s + m.monto, 0),
  total_egresos: DEMO_FINANZAS_MOVIMIENTOS.filter((m) => m.tipo_movimiento === "egreso").reduce((s, m) => s + m.monto, 0),
  balance: 0,
};
DEMO_RESUMEN_FINANCIERO.balance =
  DEMO_RESUMEN_FINANCIERO.total_ingresos - DEMO_RESUMEN_FINANCIERO.total_egresos;

export const DEMO_CUENTAS_COBRAR: CuentaPorCobrar[] = DEMO_VENTAS_HISTORIAL.filter(
  (v) => v.tipo_venta === "credito" && !v.anulada,
).slice(0, 12).map((v, i) => {
  const cobrado = Math.round(v.total * (0.2 + (i % 4) * 0.15) * 100) / 100;
  return {
    venta_id: v.id,
    cliente_id: v.cliente_id,
    cliente_nombre: v.ven_clientes.nombre,
    numero_recibo: `R-2026-${pad(100 + i)}`,
    fecha_venta: v.created_at,
    total: v.total,
    total_cobrado: Math.min(cobrado, v.total),
    saldo_pendiente: Math.round((v.total - Math.min(cobrado, v.total)) * 100) / 100,
  };
});

export const DEMO_CUENTAS_PAGAR: CuentaPorPagar[] = DEMO_COMPRAS.filter(
  (c) => c.estado_pago === "Pendiente",
).slice(0, 10).map((c) => ({
  compra_id: c.id,
  proveedor_id: c.proveedor_id,
  proveedor_nombre: c.inv_proveedores?.nombre ?? "Proveedor",
  fecha_compra: c.created_at,
  total: c.total,
  total_pagado: 0,
  saldo_pendiente: c.total,
}));

export const DEMO_CREDITOS_RESUMEN: CreditoResumen[] = DEMO_CLIENTES.filter(
  (c) => (c.creditosPendientes ?? 0) > 0,
).slice(0, 15).map((c, i) => ({
  cliente_id: c.id,
  nombre: c.nombre,
  nit: c.nit,
  limite_credito: String(800 + (i % 5) * 1000),
  total_consumido: Math.round((120 + i * 85.5) * 100) / 100,
  saldo_pendiente: Math.round((80 + i * 62.3) * 100) / 100,
  estado: (["Al día", "Atrasado", "Solventado"] as const)[i % 3],
  dias_atraso: i % 3 === 1 ? 5 + (i % 20) : 0,
}));

export const DEMO_CREDITO_DETALLE: VentaCreditoDetalle[] = DEMO_VENTAS_HISTORIAL.filter(
  (v) => v.tipo_venta === "credito",
).slice(0, 6).map((v, i) => ({
  id: v.id,
  created_at: v.created_at,
  tipo_venta: v.tipo_venta,
  total: v.total,
  observaciones: v.observaciones,
  fin_transacciones:
    i % 2 === 0
      ? [
          {
            id: `demo-abono-${pad(i + 1)}`,
            monto: Math.round(v.total * 0.3 * 100) / 100,
            fecha_movimiento: daysAgo(Math.max(0, i - 1)),
            tipo_movimiento: "ingreso",
            categoria: "abono_cliente",
          },
        ]
      : [],
}));

export function demoProductosPos() {
  return {
    productos: DEMO_PRODUCTOS.filter((p) => p.activo),
    clientes: DEMO_CLIENTES_DB,
  };
}

export function demoProveedoresYProductos() {
  return {
    proveedores: DEMO_PROVEEDORES,
    productos: DEMO_PRODUCTOS.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      precio_base: p.precio_base,
      precio_costo: p.precio_costo ?? null,
      stock_actual: p.stock_actual,
      activo: p.activo,
      proveedor_id: p.proveedor_id ?? null,
    })),
  };
}

export function demoMovimientosFinancieros(page = 1, pageSize = 50) {
  const data = DEMO_FINANZAS_MOVIMIENTOS;
  const from = (page - 1) * pageSize;
  return {
    data: data.slice(from, from + pageSize),
    count: data.length,
    page,
    pageSize,
  };
}
