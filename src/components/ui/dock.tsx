"use client"

import React, { createContext, useContext, useRef, useState } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  motion,
  AnimatePresence,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react"
import type { MotionProps } from "motion/react"
import { cn } from "@/lib/utils"

interface DockContextProps {
  mouseX: MotionValue<number>
  iconSize: number
  iconMagnification: number
  iconDistance: number
}

const DockContext = createContext<DockContextProps | undefined>(undefined)

const useDock = () => {
  const context = useContext(DockContext)
  if (!context) throw new Error("useDock must be used within Dock")
  return context
}

export interface DockProps extends VariantProps<typeof dockVariants> {
  className?: string
  iconSize?: number
  iconMagnification?: number
  iconDistance?: number
  direction?: "top" | "middle" | "bottom"
  children: React.ReactNode
}

const dockVariants = cva(
  "supports-backdrop-blur:bg-white/10 supports-backdrop-blur:dark:bg-black/10 mx-auto flex h-[58px] w-max items-center justify-center gap-2 rounded-2xl border p-2 backdrop-blur-md"
)

export const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  (
    {
      className,
      children,
      iconSize = 40,
      iconMagnification = 48, 
      iconDistance = 140,
      direction = "middle",
      ...props
    },
    ref
  ) => {
    const mouseX = useMotionValue(Infinity)

    return (
      <DockContext.Provider
        value={{
          mouseX,
          iconSize,
          iconMagnification,
          iconDistance,
        }}
      >
        <motion.div
          ref={ref}
          onMouseMove={(e) => mouseX.set(e.pageX)}
          onMouseLeave={() => mouseX.set(Infinity)}
          {...props}
          className={cn(dockVariants({ className }), {
            "items-start": direction === "top",
            "items-center": direction === "middle",
            "items-end": direction === "bottom",
          })}
        >
          {children}
        </motion.div>
      </DockContext.Provider>
    )
  }
)

Dock.displayName = "Dock"

export interface DockIconProps extends Omit<MotionProps & React.HTMLAttributes<HTMLDivElement>, "children"> {
  className?: string
  children?: React.ReactNode
  label?: string
}

export const DockIcon = ({ className, children, label, onClick, ...props }: DockIconProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const { mouseX, iconSize, iconMagnification, iconDistance } = useDock()

  const distanceCalc = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - bounds.x - bounds.width / 2
  })

  const sizeTransform = useTransform(
    distanceCalc,
    [-iconDistance, 0, iconDistance],
    [iconSize, iconMagnification, iconSize]
  )

  const size = useSpring(sizeTransform, { mass: 0.1, stiffness: 150, damping: 12 })

  const handleInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) onClick(e)
    mouseX.set(Infinity)
    setIsHovered(false)
  }

  return (
    <div className="relative flex items-center justify-center">
      <AnimatePresence>
        {isHovered && label && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -40 }}
            exit={{ opacity: 0, y: 0 }}
            className="absolute px-2 py-1 text-[10px] font-bold text-foreground bg-background/80 border border-border backdrop-blur-sm rounded-md whitespace-nowrap pointer-events-none z-60"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={ref}
        style={{ width: size, height: size }} 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleInteraction}
        className={cn(
          "flex aspect-square cursor-pointer items-center justify-center rounded-full",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    </div>
  )
}