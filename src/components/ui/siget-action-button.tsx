"use client";

import { useState } from "react";
import type { IconNode } from "lucide";
import { MorphHoverIcon } from "@/components/ui/morph-hover-icon";
import { RippleButton } from "@/components/ui/ripple-button";
import { cn } from "@/lib/utils";

export const sigetBtnSurface =
  "h-9 min-w-0 border-2 border-border bg-white px-2.5 py-0 text-xs font-bold shadow-none hover:bg-zinc-50 dark:border-zinc-700 dark:bg-card dark:hover:bg-zinc-800";

export const sigetAccent = {
  abrir: "#2E9BD0",
  enlace: "#C28A38",
  activa: "#2E9E77",
  inactiva: "#CC5C5C",
  editar: "#2E9BD0",
  guardar: "#2E9E77",
  cancelar: "#C28A38",
  quitar: "#CC5C5C",
  crear: "#2E9BD0",
  excel: "#2E9E77",
} as const;

export function SigetActionIcon({
  from,
  to,
  color,
  hovered,
  morphOnHover = true,
}: {
  from: IconNode;
  to: IconNode;
  color: string;
  hovered: boolean;
  morphOnHover?: boolean;
}) {
  return (
    <span className="inline-flex size-5 shrink-0 items-center justify-center [&_svg]:block [&_svg]:size-4">
      <MorphHoverIcon
        from={from}
        to={to}
        size={16}
        color={color}
        strokeWidth={1.75}
        spring="snappy"
        hovered={morphOnHover ? hovered : false}
      />
    </span>
  );
}

export function SigetActionButton({
  label,
  accentColor,
  rippleColor = "#E5E7EB",
  morphFrom,
  morphTo,
  onClick,
  ariaLabel,
  className,
  disabled,
  role,
  ariaChecked,
  ariaBusy,
  morphOnHover = true,
  type = "button",
  iconOnly = false,
}: {
  label: string;
  accentColor: string;
  rippleColor?: string;
  morphFrom: IconNode;
  morphTo: IconNode;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  role?: "switch";
  ariaChecked?: boolean;
  ariaBusy?: boolean;
  morphOnHover?: boolean;
  type?: "button" | "submit";
  iconOnly?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <RippleButton
      type={type}
      rippleColor={rippleColor}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      role={role}
      aria-checked={ariaChecked}
      aria-busy={ariaBusy || undefined}
      disabled={disabled}
      onPointerEnter={morphOnHover ? () => setHovered(true) : undefined}
      onPointerLeave={morphOnHover ? () => setHovered(false) : undefined}
      className={cn(
        sigetBtnSurface,
        iconOnly ? "size-9 w-9 shrink-0 px-0" : "w-full",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex max-w-full items-center justify-center leading-none",
          !iconOnly && "w-full gap-1",
        )}
      >
        {!iconOnly ? (
          <span className="truncate leading-none" style={{ color: accentColor }}>
            {label}
          </span>
        ) : null}
        <SigetActionIcon
          from={morphFrom}
          to={morphTo}
          color={accentColor}
          hovered={hovered}
          morphOnHover={morphOnHover}
        />
      </span>
    </RippleButton>
  );
}
