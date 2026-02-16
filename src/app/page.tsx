"use client";

import React, { useState } from "react";

import { ServicesSection } from "@/components/(base)/(home)/services";
import { AboutSection } from "@/components/(base)/(home)/about";
import { ContactSection } from "@/components/(base)/(home)/contact";

export default function Home() {
  const [selectedCar, setSelectedCar] = useState<any | null>(null);

  return (
    <div className="bg-background text-foreground h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth">
      <main className="w-full">
        <ServicesSection />
        <AboutSection />
        <ContactSection />
      </main>
    </div>
  );
}
