import { insigniaVencimientoLote } from "@/lib/vencimientos-gt";
import { cn } from "@/lib/utils";

export function InsigniaVencimientoLote({
  fechaVencimiento,
  className,
}: {
  fechaVencimiento?: string | null;
  className?: string;
}) {
  const insignia = insigniaVencimientoLote(fechaVencimiento);
  if (!insignia) return null;

  return (
    <span className={cn(insignia.className, className)} title={insignia.etiqueta}>
      {insignia.etiqueta}
    </span>
  );
}
