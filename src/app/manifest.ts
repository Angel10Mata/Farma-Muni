import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Farma-Muni Control - Gestión Municipal",
    short_name: "FarmaMuni",
    description: "Sistema de gestión para clínicas y farmacias municipales de Concepción Las Minas.",
    start_url: "/kore", // Inicia directamente en el panel
    display: "standalone", // Oculta la barra del navegador para que parezca app nativa
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#10b981", // El verde esmeralda institucional
    icons: [
      {
        src: "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}