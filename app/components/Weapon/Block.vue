<script setup lang="ts">
interface WeaponData {
  id: number;
  name: string;
  slug: string;
  rarity: number;
  weaponType: string;
  weaponText: string;
  mainStatType: string;
  mainStatText: string;
  icon: string;
}
const { data } = defineProps<{ data: WeaponData }>();

function getRarityBgColor(rarity: number) {
  if (rarity) {
    switch (rarity) {
      case 1:
        return "bg-linear-to-b from-#6a6d74 to-#868586";
      case 2:
        return "bg-linear-to-b from-#4b6c67 to-#519072";
      case 3:
        return "bg-linear-to-b from-#567496 to-#5392b8";
      case 4:
        return "bg-linear-to-b from-#5e5789 to-#9c75b7";
      case 5:
        return "bg-linear-to-b from-#945c2c to-#b27330";
    }
  }
}

function getRarityRingColor(rarity: number) {
  if (rarity) {
    switch (rarity) {
      case 1:
        return "ring-#868586";
      case 2:
        return "ring-#519072";
      case 3:
        return "ring-#5392b8";
      case 4:
        return "ring-#9c75b7";
      case 5:
        return "ring-#b27330";
    }
  }
}
</script>

<template>
  <NuxtLink
    :to="`/weapon/${data.slug}`"
    class="flex flex-col justify-center items-center bg-zinc-200 rounded-lg hover:scale-105% hover:ring-2 transition-shadow ease-in-out"
    :class="getRarityRingColor(data.rarity)"
  >
    <div class="relative">
      <NuxtImg
        :src="'https://assets.wysalan.com/cementarii/weapon-icon/' + data.icon + '.webp'"
        :alt="data.name"
        width="96"
        height="96"
        class="w-25 h-25 lg:w-35 lg:h-35 mask-[linear-gradient(to_bottom,black_85%,transparent_100%)] rounded-t-lg"
        :class="getRarityBgColor(data.rarity)"
        placeholder
      />
      <!-- <div class="absolute top-1.25 left-1.25">
        <NuxtImg
          :src="'https://assets.wysalan.com/cementarii/elements/' + getElementIcon(data) + '.png'"
          :alt="data.elementText + '元素圖示'"
          width="30"
          height="30"
          placeholder
          class="w-25px h-25px md:w-30px md:h-30px bg-zinc-900/60 backdrop-blur-sm rounded-lg"
          v-if="data.elementType !== 'ELEMENT_NONE'"
        />
      </div> -->
    </div>
    <div class="flex flex-col justify-center items-center h-10 w-full my-1">
      <p class="break-all w-20 xl:w-30 text-center">{{ data.name }}</p>
    </div>
  </NuxtLink>
</template>

<style scoped></style>
