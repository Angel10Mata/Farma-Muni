"use client";

import { MessageCircle, Phone, MapPin, PhoneCall } from "lucide-react";
import { motion } from "framer-motion";
import { AuroraText } from "@/components/ui/aurora-text";

export function ContactSection() {
  const telDisplay = "+1 (845) 309-7936";
  const whatsappUrl = "https://wa.me/18453097936";

  return (
    <section
      id="contact"
      className="min-h-screen lg:h-screen w-full snap-start flex flex-col justify-between px-6 pt-28 pb-10 bg-background text-foreground border-t border-border/40 overflow-hidden"
    >
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center text-center mb-6 lg:mb-8 space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <PhoneCall className="size-3 text-primary" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary">
              Contact
            </span>
          </div>
          <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter italic leading-none">
            Let's Talk
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full p-6 lg:p-12 bg-card/40 backdrop-blur-xl border border-zinc-300 dark:border-zinc-700 rounded-4xl relative"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-4 lg:space-y-6 text-center lg:text-left">
              <p className="text-muted-foreground text-sm lg:text-base font-medium leading-relaxed">
                Visite nuestra sucursal principal o contáctenos en línea para
                asistencia farmacéutica inmediata.
              </p>
              <div className="flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl bg-muted/50 border border-zinc-200 dark:border-zinc-800">
                <MapPin className="text-primary size-4 shrink-0" />
                <span className="font-bold uppercase text-[10px] lg:text-xs tracking-tight leading-tight">
                  3651 Danbury Road, Brewster, NY 10509
                </span>
              </div>
            </div>

            <div className="grid gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                className="group flex items-center justify-between p-4 lg:p-6 rounded-3xl bg-background border border-zinc-300 dark:border-zinc-700 hover:bg-emerald-500 text-black dark:text-white hover:text-white dark:hover:text-black transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <MessageCircle className="size-6 lg:size-8 text-emerald-500 group-hover:text-inherit" />
                  <div className="text-left font-bold uppercase">
                    <p className="text-[9px] opacity-60 tracking-widest text-inherit">
                      WhatsApp
                    </p>
                    <p className="text-sm lg:text-lg text-inherit">Chat Now</p>
                  </div>
                </div>
              </a>

              {/* Call Us Button - Texto: Negro(Light) / Blanco(Dark) -> Hover: Blanco(Light) / Negro(Dark) */}
              <a
                href={`tel:18453097936`}
                className="group flex items-center justify-between p-4 lg:p-6 rounded-3xl bg-background border border-zinc-300 dark:border-zinc-700 hover:bg-primary text-black dark:text-white hover:text-white dark:hover:text-black transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <Phone className="size-6 lg:size-8 text-primary group-hover:text-inherit" />
                  <div className="text-left font-bold uppercase">
                    <p className="text-[9px] opacity-60 tracking-widest text-inherit">
                      Call Us Now
                    </p>
                    <p className="text-sm lg:text-lg text-inherit tracking-tighter">
                      {telDisplay}
                    </p>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer anclado abajo con texto XS fijo */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-center mt-auto space-y-1"
      >
        <p className="text-xs font-bold uppercase tracking-widest opacity-40">
          © 2026 FARMACIA KORE C.A.
        </p>
        <p className="text-xs font-bold uppercase tracking-widest">
          Powered by{" "}
          <a
            href="https://www.oscar27jimenez.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline cursor-pointer transition-all inline-block"
          >
            <AuroraText>Kore.dev</AuroraText>
          </a>
        </p>
      </motion.div>
    </section>
  );
}
