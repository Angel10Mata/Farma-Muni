import { Suspense } from "react";
import { EditarProductoPorId } from "@/components/(base)/inventario/EditarProductoPorId";

export const metadata = {
  title: "Editar Producto | FarmaMuni",
  description: "Modificar un producto del inventario",
};

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
