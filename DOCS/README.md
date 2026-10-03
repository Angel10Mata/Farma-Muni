# Documentación FarmaMuni (KoreAPP)

Entregables para memoria / informe técnico.

## Contenido

| Recurso | Descripción |
|--------|-------------|
| `mockups/` | **25 wireframes en blanco y negro** (SVG), uno por pantalla o flujo principal |
| `FarmaMuni-Codificacion.pdf` | **Codificación** (~19 páginas): fragmentos de código, figuras numeradas y texto explicativo (estilo informe académico) |
| `generate-docs.mjs` | Script para regenerar mockups y PDF |

## Mockups (25)

1. Inicio de sesión  
2. Panel principal  
3. Inventario — listado  
4. Inventario — nuevo producto  
5. Inventario — editar producto  
6. Ventas — punto de venta  
7. Ventas — historial  
8. Clientes — directorio  
9. Clientes — ficha e historial  
10. Clientes — crear/editar  
11. Compras — registrar  
12. Compras — proveedores  
13. Compras — historial global  
14. Compras — cuentas por pagar  
15. Proveedor — detalle  
16. Créditos — por cobrar  
17. Créditos — pagados  
18. Finanzas — control  
19. Finanzas — movimiento  
20. Admin — usuarios  
21. Admin — configuraciones  
22. Admin — dispositivos  
23. Registro farmacia  
24. Perfil usuario  
25. Acceso restringido  

Abre cualquier `.svg` en el navegador o insértalo en Word/LibreOffice. Para PNG: imprimir o exportar desde el visor.

## Regenerar

```bash
node DOCS/generate-docs.mjs
```

## Nota

Los mockups son **wireframes de referencia** (no capturas de pantalla del build). El PDF incluye rutas reales del repositorio (`src/...`) tomadas en el momento de la generación.
