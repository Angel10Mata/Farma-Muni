"use client"
import { useForm } from "react-hook-form";
import { crearProductoAction } from "@/lib/actions";

interface ProductoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Producto({ isOpen, onClose }: ProductoProps) {
  const { register, handleSubmit, reset } = useForm();

  if (!isOpen) return null;

  const onSubmit = async (data: any) => {
    const result = await crearProductoAction(data);
    if (result.success) {
      alert("¡Producto guardado!");
      reset(); // Limpia el formulario
      onClose(); // Cierra el modal
    } else {
      alert("Error: " + result.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96 text-black">
        <h2 className="text-xl font-bold mb-4">Nuevo Producto</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <input 
            {...register("nombre")} 
            placeholder="Nombre del producto" 
            className="border p-2 rounded" 
            required 
          />
          <input 
            {...register("precio")} 
            type="number" 
            step="0.01"
            placeholder="Precio (ej: 10.50)" 
            className="border p-2 rounded" 
            required 
          />
          <textarea 
            {...register("descripcion")} 
            placeholder="Descripción" 
            className="border p-2 rounded"
          />
          
          <div className="flex gap-2 mt-2">
            <button type="submit" className="bg-blue-600 text-white p-2 rounded flex-1">
              Guardar Producto
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="bg-gray-200 p-2 rounded flex-1 text-black"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}