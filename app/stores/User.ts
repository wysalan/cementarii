export const useUserStore = defineStore("user", {
  state: () => ({ name: "旅行者" }),
  actions: {
    changeUserName(newName: string) {
      this.name = newName;
    },
  },
  persist: true,
});
