import { MetadataRoute } from "next";
import { APP_LOGO_PATH } from "@/lib/app-config";

// App instalable (PWA)
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
        src: APP_LOGO_PATH,
        sizes: "64x64 192x192 512x512",
        type: "image/webp",
        purpose: "any",
      },
      {
        src: APP_LOGO_PATH,
        sizes: "64x64 192x192 512x512",
        type: "image/webp",
        purpose: "maskable",
      },
    ],
  };
}
