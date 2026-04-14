export const useUserStore = defineStore("user", {
  state: () => ({ name: "旅行者", playerGender: "male" }),
  actions: {
    changeUserName(newName: string) {
      this.name = newName;
    },
    changeGender(newGender: string) {
      this.playerGender = newGender;
    },
  },
  persist: true,
});
