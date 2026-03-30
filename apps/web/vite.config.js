import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["icon.svg"],
            manifest: {
                name: "Patched",
                short_name: "Patched",
                description:
                    "Reportá problemas de infraestructura urbana en tu ciudad",
                theme_color: "#059669",
                background_color: "#f9fafb",
                display: "standalone",
                start_url: "/",
                icons: [
                    {
                        src: "/icon.svg",
                        sizes: "any",
                        type: "image/svg+xml",
                        purpose: "any maskable",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
                runtimeCaching: [
                    {
                        urlPattern:
                            /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "osm-tiles",
                            expiration: {
                                maxEntries: 200,
                                maxAgeSeconds: 60 * 60 * 24 * 30,
                            },
                        },
                    },
                    {
                        urlPattern: /^http:\/\/localhost:3000\/api\/.*/i,
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "api-cache",
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 5,
                            },
                        },
                    },
                ],
            },
        }),
    ],
});
