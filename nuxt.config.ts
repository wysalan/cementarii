import { siteConfig } from "./app/site.config";
import Zoir from "./app/presets/Noir";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@unocss/nuxt",
    "@nuxt/icon",
    "@nuxt/image",
    "@primevue/nuxt-module",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
    "@nuxtjs/color-mode",
  ],

  css: ["@/assets/css/global.css", "@/assets/css/fonts.css"],

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
  primevue: {
    autoImport: true,
    options: {
      theme: {
        preset: Zoir,
        mergeProps: true,
      },
    },
    directives: {
      include: ["Tooltip"],
    },
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
