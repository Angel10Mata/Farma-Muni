"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CrearCatalogo, CrearGenerico } from "./forms/Crear";

export function NuevoProducto() {
  const router = useRouter();
  const [genericoAbierto, setGenericoAbierto] = useState(false);
  const [catalogoTrasAlta, setCatalogoTrasAlta] = useState<string | undefined>();

  return (
    <>
      <CrearCatalogo
        onClose={() => router.push("/farmamuni/inventario")}
        onSuccess={() => {}}
        onAgregarGenerico={(catalogoId) => {
          setCatalogoTrasAlta(catalogoId);
          setGenericoAbierto(true);
        }}
      />
      {genericoAbierto ? (
        <CrearGenerico
          catalogoIdInicial={catalogoTrasAlta}
          onClose={() => {
            setGenericoAbierto(false);
            router.push("/farmamuni/inventario");
          }}
          onSuccess={() => router.push("/farmamuni/inventario")}
        />
      ) : null}
    </>
  );
}
