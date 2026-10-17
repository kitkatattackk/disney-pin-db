import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pinfolio · Personal pin collection",
    short_name: "Pinfolio",
    description: "Your personal pin catalog and scanner.",
    start_url: "/",
    display: "standalone",
    background_color: "#1d1d22",
    theme_color: "#1d1d22",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
