import { siteConfig } from "./app/site.config";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/ui", "@nuxt/image", "@pinia/nuxt", "pinia-plugin-persistedstate/nuxt"],

  css: ["@/assets/css/main.css", "@/assets/css/fonts.css"],

  app: {
    head: {
      title: siteConfig.title,
      htmlAttrs: {
        lang: siteConfig.language,
      },
      meta: [
        {
          name: "description",
          content: siteConfig.description,
        },
      ],
    },
    rootAttrs: {
      id: "site-content",
    },
  },
  icon: {
    serverBundle: { collections: ["lucide"] },
    clientBundle: { icons: ["lucide:sun", "lucide:moon"], scan: true },
  },
  image: {
    provider: "ipx",
  },

  typescript: {
    tsConfig: {
      include: ["./app/types/*"],
      compilerOptions: {
        types: ["node"],
      },
    },
  },
});
