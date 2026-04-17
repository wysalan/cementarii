export const useUserStore = defineStore("user", {
  state: () => ({ name: "旅行者", playerGender: "male", defaultTalentLevel: 1 }),
  actions: {
    changeUserName(newName: string) {
      this.name = newName;
    },
    changeGender(newGender: string) {
      this.playerGender = newGender;
    },
    changeDefaultTalentLevel(newLevel: number) {
      this.defaultTalentLevel = newLevel;
    },
  },
  persist: true,
});
