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
  ],

  css: ["@/assets/css/global.css", "@/assets/css/fonts.css"],

  app: {
    head: {
      title: "Cementarii",
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
      },
    },
    directives: {
      include: ["Tooltip"],
    },
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
