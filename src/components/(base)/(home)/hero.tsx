"use client"

import { Particles } from "@/components/ui/particles"
import { AuroraText } from "@/components/ui/aurora-text"
import { ShinyButton } from "@/components/ui/shiny-button"
import { motion } from "framer-motion"
import Link from "next/link"

export function HeroSection() {
  return (
    <section id="hero" className="relative w-full min-h-screen snap-start flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background Particles */}
      <Particles
        className="absolute inset-0 z-0 opacity-50 dark:opacity-30"
        quantity={150}
        ease={80}
        color="#10b981" 
        refresh
      />

      <div className="z-10 flex flex-col items-center text-center px-6 max-w-5xl mt-20 lg:mt-0">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-8 flex items-center gap-2 px-5 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-md shadow-inner shadow-emerald-500/20"
        >
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></span>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Abierto 24/7 para ti
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-foreground mb-6 leading-[1.1] md:leading-[1.1] lg:leading-[1.1]"
        >
          Bienvenido a <br className="hidden md:block" />
          <AuroraText colors={["#10b981", "#059669", "#3b82f6", "#0ea5e9"]}>
            Farmacia Kore
          </AuroraText>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl font-medium leading-relaxed"
        >
          Atención médica, control crónico y farmacia confiable. 
          Cuidamos de ti y de tu familia con los más altos estándares de calidad y ética profesional.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
        >
          <Link href="#services" className="w-full sm:w-auto">
            <ShinyButton className="w-full bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <span className="font-extrabold tracking-wide uppercase text-sm">Nuestros Servicios</span>
            </ShinyButton>
          </Link>
          <Link href="/kore" className="w-full sm:w-auto px-8 py-3 rounded-xl border-2 border-border/50 bg-background/50 hover:bg-muted font-bold transition-all backdrop-blur-md shadow-sm">
            Ir al Panel Clínico
          </Link>
        </motion.div>
      </div>

      {/* Decorative Gradients */}
      <div className="absolute top-[10%] -left-[10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] -right-[10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
    </section>
  )
}
