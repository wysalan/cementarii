import { defineConfig, presetMini } from "unocss";
import transformerDirectives from "@unocss/transformer-directives";
import presetWind4 from "@unocss/preset-wind4";

export default defineConfig({
  transformers: [transformerDirectives()],
  presets: [presetWind4(), presetMini()],
  theme: {
    colors: {
      background: "#fafafa",
      backgroundDark: "#2b2b2b",
    },
  },
});
