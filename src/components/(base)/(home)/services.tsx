"use client"

import { Globe, ShieldCheck, Truck, Zap } from "lucide-react"
import { motion } from "framer-motion"

export function ServicesSection() {
  const services = [
    { title: "Dispensación Rx", desc: "Entrega precisa y segura de medicamentos recetados.", icon: ShieldCheck, color: "from-blue-500 to-cyan-400" },
    { title: "Control Crónico", desc: "Seguimiento y abasto para pacientes de largo tratamiento.", icon: Globe, color: "from-purple-500 to-pink-500" },
    { title: "Atención Rápida", desc: "Servicio ágil en mostrador con asesoría profesional.", icon: Zap, color: "from-orange-500 to-red-500" }
  ]

  return (
    <section id="services" className="min-h-screen lg:h-screen w-full snap-start flex flex-col items-center justify-start lg:justify-center px-6 pt-28 lg:pt-0 border-t border-border/40 bg-background overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: false, amount: 0.5 }}
        transition={{ duration: 1.8, ease: "linear" }}
        className="text-center mb-12 lg:mb-16 space-y-4"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Zap className="size-3 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Services</span>
        </div>
        <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter italic text-foreground leading-none">Our Services</h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl w-full pb-10">
        {services.map((s, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 1, ease: "linear", delay: 0.4 + (idx * 0.2) }}
            className="group relative p-8 lg:p-10 rounded-4xl border border-border/50 bg-card/30 backdrop-blur-xl transition-all shadow-sm"
          >
            <div className={`size-14 lg:size-16 rounded-2xl bg-linear-to-br ${s.color} flex items-center justify-center mb-6 lg:mb-8 shadow-lg`}>
              <s.icon className="size-6 lg:size-8 text-white" />
            </div>
            <h3 className="text-xl lg:text-2xl font-black mb-4 uppercase text-foreground">{s.title}</h3>
            <p className="text-muted-foreground text-sm font-medium leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}