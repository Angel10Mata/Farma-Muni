"use client";

import { HeroSection } from "@/components/(base)/(home)/hero";
import { ServicesSection } from "@/components/(base)/(home)/services";
import { AboutSection } from "@/components/(base)/(home)/about";
import { ContactSection } from "@/components/(base)/(home)/contact";

export default function Home() {
  return (
    <div className="bg-background text-foreground h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth relative">
      <main className="w-full">
        <HeroSection />
        <ServicesSection />
        <AboutSection />
        <ContactSection />
      </main>
    </div>
  );
}
