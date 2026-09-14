import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Compás · Clase de bachata",
    short_name: "Compás",
    description: "Vídeos de la clase de bachata de los jueves",
    start_url: "/events",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2f8a4f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
