"use client";

import { useEffect, useRef, useState } from "react";
import { MorphIcon, type MorphHandle } from "morphicons/react";
import type { IconNode } from "lucide";
import { cn } from "@/lib/utils";

type MorphHoverIconProps = {
  from: IconNode;
  to: IconNode;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  spring?: "smooth" | "snappy" | "bouncy";
  hovered?: boolean;
};

export function MorphHoverIcon({
  from,
  to,
  size = 28,
  color = "currentColor",
  strokeWidth = 1.75,
  className,
  spring = "smooth",
  hovered,
}: MorphHoverIconProps) {
  const morphRef = useRef<MorphHandle>(null);
  const fromRef = useRef(from);
  const toRef = useRef(to);
  const [localHovered, setLocalHovered] = useState(false);
  const active = hovered ?? localHovered;

  fromRef.current = from;
  toRef.current = to;

  useEffect(() => {
    const handle = morphRef.current;
    if (!handle) return;

    if (active) {
      handle.morphTo(toRef.current, spring);
      return;
    }

    handle.morphTo(fromRef.current, spring);
  }, [active, spring]);

  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      onPointerEnter={
        hovered === undefined ? () => setLocalHovered(true) : undefined
      }
      onPointerLeave={
        hovered === undefined ? () => setLocalHovered(false) : undefined
      }
    >
      <MorphIcon
        ref={morphRef}
        icon={from}
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        spring={spring}
      />
    </span>
  );
}
