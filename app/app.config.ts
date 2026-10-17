export default defineAppConfig({
  ui: {
    colors: {
      primary: "gold",
      neutral: "navy",
    },
    button: {
      defaultVariants: {
        color: "neutral",
        variant: "soft",
      },
    },
    card: {
      slots: {
        root: "rounded-xl",
      },
    },
    modal: {
      slots: {
        title: "pr-10",
      },
    },
  },
});
