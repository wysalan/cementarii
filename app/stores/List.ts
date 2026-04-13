export const useListStore = defineStore("list", {
  state: () => ({ useCostumeIcon: false }),
  getters: {
    switch() {
      this.useCostumeIcon = !this.useCostumeIcon;
    },
  },
  persist: true,
});
