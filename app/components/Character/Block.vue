<script setup lang="ts">
import { useListStore } from "@/stores/List";
const store = useListStore();

interface CharacterData {
  listIndex: number;
  id: number;
  name: Record<string, string>;
  rarity: number;
  region: string;
  elementType: string;
  elementText: string;
  weaponType: string;
  weaponText: string;
  slug: string;
  avatar: string;
  costumeAvatar: string;
}
const { data } = defineProps<{ data: CharacterData }>();

function getAvatarFileName(character: CharacterData) {
  if (store.useCostumeIcon && character.costumeAvatar) {
    return character.costumeAvatar;
  } else {
    return character.avatar;
  }
}

function getElementIcon(character: CharacterData) {
  switch (character.elementText) {
    case "火":
      return "pryo";
    case "水":
      return "hydro";
    case "雷":
      return "electro";
    case "冰":
      return "cyro";
    case "風":
      return "anemo";
    case "岩":
      return "geo";
    case "草":
      return "dendro";
    default:
      return "unknown";
  }
}
</script>

<template>
  <NuxtLink
    :to="`/character/${data.slug}`"
    class="flex flex-col justify-center items-center bg-zinc-200 rounded-lg hover:scale-105% hover:ring-2 transition-shadow ease-in-out"
    :class="data.rarity === 4 ? 'ring-#9c75b7' : 'ring-#b27330'"
  >
    <div class="relative">
      <NuxtImg
        :src="
          'https://assets.wysalan.com/cementarii/avatar-icon/' + getAvatarFileName(data) + '.webp'
        "
        :alt="data.name"
        width="96"
        height="96"
        class="w-25 h-25 lg:w-35 lg:h-35 mask-[linear-gradient(to_bottom,black_85%,transparent_100%)] rounded-t-lg"
        :class="
          data.rarity === 4
            ? 'bg-linear-to-b from-#5e5789 to-#9c75b7'
            : 'bg-linear-to-b from-#945c2c to-#b27330'
        "
        placeholder
      />
      <div class="absolute top-1.25 left-1.25">
        <NuxtImg
          :src="'https://assets.wysalan.com/cementarii/elements/' + getElementIcon(data) + '.png'"
          :alt="data.elementText + '元素圖示'"
          width="30"
          height="30"
          placeholder
          class="w-25px h-25px md:w-30px md:h-30px bg-zinc-900/60 backdrop-blur-sm rounded-lg"
          v-if="data.elementType !== 'ELEMENT_NONE'"
        />
      </div>
    </div>
    <div class="flex flex-col justify-center items-center h-10 w-full">
      <p>{{ data.name["CHT"] }}</p>
    </div>
  </NuxtLink>
</template>

<style scoped></style>
