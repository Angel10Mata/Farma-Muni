import { APP_BASE_PATH } from "@/lib/app-config";

export interface AppModuleConfig {
  id: string;
  title: string;
  subtitle: string;
  desc: string;
  href: string;
  allowedRoles?: string[];
  requiresAdmin?: boolean;
  bento: string;
  size: "hero" | "tall" | "wide" | "compact";
  tag: string;
  cardBg: string;
  cardBorder: string;
}

export const APP_MODULES: AppModuleConfig[] = [
  {
    id: "ventas",
    title: "Ventas",
    subtitle: "",
    desc: "Punto de venta, control de caja diaria, reportes de ingresos y facturación.",
    href: `${APP_BASE_PATH}/ventas`,
    allowedRoles: ["super", "admin", "ventas", "user"],
    bento: "col-span-1 row-span-2 md:col-span-2 md:row-span-2",
    size: "hero",
    tag: "Facturación · Caja",
    cardBg: "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/90",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
  },
  {
    id: "clientes",
    title: "Clientes",
    subtitle: "",
    desc: "Directorio de clientes, historial de compras, saldos y fichas de contacto.",
    href: `${APP_BASE_PATH}/clientes`,
    allowedRoles: ["super", "admin", "clientes", "ventas"],
    bento: "col-span-1 row-span-1 md:col-start-3 md:row-start-1",
    size: "compact",
    tag: "Directorio · Historial",
    cardBg: "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/90",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
  },
  {
    id: "proveedores",
    title: "Proveedores",
    subtitle: "",
    desc: "Catálogo de proveedores autorizados, órdenes de compra y facturas.",
    href: `${APP_BASE_PATH}/proveedores`,
    allowedRoles: ["super", "admin", "proveedores"],
    bento: "col-span-1 row-span-1 md:col-start-3 md:row-start-2",
    size: "compact",
    tag: "Contacto · Compras",
    cardBg: "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/90",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
  },
  {
    id: "finanzas",
    title: "Finanzas",
    subtitle: "",
    desc: "Ingresos, egresos, control de gastos fijos y pagos de clientes.",
    href: `${APP_BASE_PATH}/finanzas`,
    allowedRoles: ["super", "admin"],
    bento: "col-span-1 row-span-1 md:col-start-1 md:row-start-3",
    size: "compact",
    tag: "Ingresos · Egresos",
    cardBg: "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/90",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
  },
  {
    id: "inventario",
    title: "Inventario",
    subtitle: "",
    desc: "Control de existencias de medicamentos, lotes, vencimientos y categorías.",
    href: `${APP_BASE_PATH}/inventario`,
    allowedRoles: ["super", "admin", "inventario"],
    bento: "col-span-1 row-span-1 md:col-start-3 md:row-start-3",
    size: "compact",
    tag: "Existencias · Lotes",
    cardBg: "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/90",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
  },
  {
    id: "creditos",
    title: "Créditos",
    subtitle: "",
    desc: "Gestión de créditos, estados de cuenta y registros de abonos.",
    href: `${APP_BASE_PATH}/creditos`,
    allowedRoles: ["super", "admin", "ventas", "finanzas"],
    bento: "col-span-1 row-span-1 md:col-start-2 md:row-start-3",
    size: "compact",
    tag: "Cuentas por cobrar",
    cardBg: "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/90",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
  },
];

export const ADMIN_MENU_ITEMS = [
  {
    id: "dispositivos",
    href: `${APP_BASE_PATH}/admin/dispositivos`,
    title: "Dispositivos",
    desc: "Autorizar o rechazar solicitudes de acceso por dispositivo.",
  },
  {
    id: "usuarios",
    href: `${APP_BASE_PATH}/admin/usuarios`,
    title: "Usuarios",
    desc: "Gestionar cuentas de usuario, roles y permisos.",
  },
  {
    id: "configuraciones",
    href: `${APP_BASE_PATH}/admin/configuraciones`,
    title: "Configuraciones",
    desc: "Ajustes generales del sistema y seguridad.",
  },
] as const;
