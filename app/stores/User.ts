export const useUserStore = defineStore("user", {
  state: () => ({
    name: "旅行者",
    playerGender: "male",
    defaultTalentLevel: 1,
    useCostumeIcon: false,
    characterBg: "extractFromAvatar",
    hoyolab: null as HoyolabLink | null,
  }),
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
    changeIconState() {
      this.useCostumeIcon = !this.useCostumeIcon;
    },
    setCharacterBg(newCharacterBg: string) {
      this.characterBg = newCharacterBg;
    },
    setHoyolab(link: HoyolabLink | null) {
      this.hoyolab = link;
    },
  },
  persist: {
    storage: piniaPluginPersistedstate.localStorage(),
  },
});
