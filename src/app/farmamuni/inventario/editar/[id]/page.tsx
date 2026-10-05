import { Suspense } from "react";
import { EditarProductoPorId } from "@/components/(base)/inventario/EditarProductoPorId";

// Título de la página

export const metadata = {
  title: "Editar Producto | FarmaMuni",
  description: "Modificar un producto del inventario",
};

// Editar producto por id

export default async function EditarProductoPageRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <EditarProductoPorId id={id} />
    </Suspense>
  );
}
