import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FarmaMuni",
    short_name: "FarmaMuni",
    description:
      "Sistema de Gestión FarmaMuni para la optimización de operaciones y mejora de la eficiencia.",
    start_url: "/farmamuni",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/farmamuni/logo.png",
        sizes: "64x64 192x192 512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/farmamuni/logo.png",
        sizes: "64x64 192x192 512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
