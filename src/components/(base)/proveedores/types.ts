export interface Proveedor {
  id: string;
  nombre: string;
  descripcion?: string | null;
  nit?: string | null;
  telefono?: string | null;
  correo?: string | null;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  precio_base: number;
  precio_costo?: number | null;
  stock_actual: number;
  proveedor_id?: string | null;
}

export interface ItemCarritoCompra {
  producto: Producto;
  cantidad: number;
  precio_costo: number;
  subtotal: number;
}

export interface Compra {
  id: string;
  created_at: string;
  proveedor_id: string;
  total: number;
  estado_pago: string;
  fecha_pago: string | null;
  observaciones: string | null;
  fin_transacciones?: any[];
  inv_proveedores?: {
    nombre: string;
    nit: string | null;
  } | null;
  inv_compras_detalles?: any[];
}
