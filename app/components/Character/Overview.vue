<script setup lang="ts">
import { storageConfig } from "@/site.config";
import curve from "@/data/curve.json";
import type { character } from "@/generated/prisma/client";
const { data } = defineProps<{ data: character }>();

interface outfitItem {
  [key: string]: {
    id: number;
    name: string;
    description: string;
    isDefault: boolean;
    images: Record<string, string>;
    version: string;
  };
}

interface Promotions {
  [key: string]: {
    maxlevel: number;
    hp: number;
    attack: number;
    defense: number;
    specialized: number;
  };
}

interface PromotionItem {
  [key: string]: {
    hp: number;
    attack: number;
    defense: number;
    specialized: number;
  };
}

interface Curve {
  [key: string]: {
    [key: string]: number;
  };
}

interface curveItem {
  [key: string]: number;
}

const outfitList = defineModel<string[]>("outfitList");
const selectedOutfit = defineModel<string>("selectedOutfit");
const outfitImgs = defineModel<Record<string, string>>("outfitImgs");

const outfitsObject = data.outfits
  ? Object.fromEntries(data.outfits.map((outfit) => [outfit.name, outfit]))
  : {};

const levelIndex = ref(6);
const levelTicks = [20, 40, 50, 60, 70, 80, 90, 95, 100];

const actualLevel = computed(() => {
  return levelTicks[levelIndex.value];
});

function getElementIcon(character: character) {
  switch (character.element_text) {
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

const calculatedStats = computed(() => {
  const characterCurve: Curve = curve.characters;
  const level: keyof Curve = actualLevel.value || 0;
  const promotions = ref<Promotions>();
  const baseStats = {
    hp: data.stats?.hp.base || 0,
    atk: data.stats?.attack.base || 0,
    def: data.stats?.defense.base || 0,
    sp: data.stats?.substat.base || 0,
  };

  if (data.stats?.promotion) {
    promotions.value = Object.fromEntries(
      data.stats?.promotion.map((promotion) => [promotion.maxlevel, promotion]),
    );
  }

  const result = ref({
    hp:
      baseStats.hp * (characterCurve?.[level]?.[data.stats?.hp.curve as keyof curveItem] || 0) +
      (promotions.value?.[(level >= 90 ? 90 : level) as keyof PromotionItem]?.hp || 0),
    atk:
      baseStats.atk *
        (characterCurve?.[level]?.[data.stats?.attack.curve as keyof curveItem] || 0) +
      (promotions.value?.[(level >= 90 ? 90 : level) as keyof PromotionItem]?.attack || 0),
    def:
      baseStats.def *
        (characterCurve?.[level]?.[data.stats?.defense.curve as keyof curveItem] || 0) +
      (promotions.value?.[(level >= 90 ? 90 : level) as keyof PromotionItem]?.defense || 0),
    sp:
      baseStats.sp +
      (promotions.value?.[(level >= 90 ? 90 : level) as keyof PromotionItem]?.specialized || 0),
  });

  return result.value;
});

const detailOpen = ref(false);

const materialCalculationMethod = ref("累計");
const materialCalculationOption = ref(["單一", "累計"]);
const costsValue = Object.values(data!.costs!);

const materialCalculationResult = computed(() => {
  if (materialCalculationMethod.value === "累計") {
    const map = new Map();
    costsValue
      .slice(0, levelIndex.value)
      .flat()
      .forEach((item) => {
        if (map.has(item.id)) {
          map.get(item.id)!.count += item.count;
        } else {
          map.set(item.id, { ...item });
        }
      });
    return [...map.values()].sort((a, b) => a.id - b.id);
  } else {
    return costsValue[levelIndex.value - 1];
  }
});

function getSubstatValue(type: string | undefined, substat: number) {
  if (type) {
    if (type === "FIGHT_PROP_ELEMENT_MASTERY") {
      return substat.toFixed(0);
    }
    return (substat * 100).toFixed(1) + "%";
  }
}
</script>

<template>
  <!-- 右側：角色數值（模仿遊戲內屬性面板） -->
  <div
    class="xl:absolute xl:right-10 xl:top-[calc(50%+34px)] xl:-translate-y-1/2 xl:z-10 max-xl:mt-[36vh] max-xl:mx-4 xl:max-h-[85vh] overflow-y-auto max-xl:mb-30"
  >
    <div
      class="flex flex-col bg-navy-900/75 backdrop-blur-md border border-gold-500/30 rounded-lg h-fit w-full xl:w-100 p-5 gap-5 shadow-lg text-parchment-100"
    >
      <div class="flex flex-row justify-start items-center gap-3">
        <NuxtImg
          :src="`${storageConfig.baseUrl}/avatar-icon/${outfitImgs?.AvatarIcon}.webp`"
          class="w-15 h-15 rounded-sm"
          :class="
            data.rarity === 4
              ? 'bg-linear-to-b from-[#5e5789] to-[#9c75b7]'
              : 'bg-linear-to-b from-[#945c2c] to-[#b27330]'
          "
        />
        <div class="text-left">
          <h2 class="text-xl md:text-2xl font-semibold text-white">{{ data.name }}</h2>
          <p class="text-sm md:text-base text-gold-300">{{ data.title }}</p>
        </div>
        <UBadge color="primary" variant="soft" class="select-none ml-auto self-start">
          Ver. {{ data.version }}
        </UBadge>
      </div>
      <div class="font-semibold text-left text-parchment-100/70 text-sm md:text-base">
        {{ data.description }}
      </div>
      <div class="flex flex-row items-center gap-5">
        <div
          class="bg-gold-400 rounded-sm p-2 w-25 text-center select-none font-semibold text-navy-900"
        >
          Lv. <span class="font-bold">{{ actualLevel }}</span>
        </div>
        <USlider
          v-model="levelIndex"
          :min="0"
          :max="levelTicks.length - 1"
          :step="1"
          class="w-full"
        />
      </div>
      <div class="flex flex-col divide-y divide-white/10">
        <div class="flex flex-row justify-between text-sm md:text-base py-2.5">
          <p class="font-semibold text-parchment-100/80">生命值上限</p>
          <p class="text-white">{{ calculatedStats.hp.toFixed(0) }}</p>
        </div>
        <div class="flex flex-row justify-between text-sm md:text-base py-2.5">
          <p class="font-semibold text-parchment-100/80">攻擊力</p>
          <p class="text-white">{{ calculatedStats.atk.toFixed(0) }}</p>
        </div>
        <div class="flex flex-row justify-between text-sm md:text-base py-2.5">
          <p class="font-semibold text-parchment-100/80">防禦力</p>
          <p class="text-white">{{ calculatedStats.def.toFixed(0) }}</p>
        </div>
        <div class="flex flex-row justify-between text-sm md:text-base py-2.5">
          <p class="font-semibold text-parchment-100/80">{{ data.stats?.substat.text }}</p>
          <p class="text-white">
            {{ getSubstatValue(data.stats?.substat.type, calculatedStats.sp) }}
          </p>
        </div>
      </div>
    </div>
    <!-- 詳細資訊按鈕（模仿遊戲內樣式） -->
    <button
      type="button"
      class="block w-full xl:w-100 mt-4 rounded-full border border-parchment-100/50 bg-navy-900/60 backdrop-blur-md py-2 text-parchment-100 font-semibold hover:bg-parchment-100/25 hover:text-white transition-colors cursor-pointer"
      @click="detailOpen = true"
    >
      詳細資訊
    </button>
    <div
      class="flex flex-col bg-navy-900/75 backdrop-blur-md border border-gold-500/30 rounded-lg h-fit w-full xl:w-100 p-5 gap-5 mt-4 shadow-lg text-parchment-100"
    >
      <div class="flex flex-col justify-start items-center gap-3">
        <div class="flex flex-row justify-between items-center w-full">
          <h2
            class="gi-diamond text-base md:text-lg font-semibold text-white flex items-center gap-1"
          >
            升級所需素材
            <UTooltip :text="'將角色升至 ' + actualLevel + ' 級所需要的素材'">
              <UIcon name="i-lucide-circle-help" class="size-4 text-parchment-100/60" />
            </UTooltip>
          </h2>
          <USelect
            v-model="materialCalculationMethod"
            :items="materialCalculationOption"
            aria-label="選擇計算方式"
          />
        </div>
        <div
          class="flex flex-row justify-start max-w-full overflow-x-auto gap-1"
          v-if="materialCalculationResult?.toString().length"
        >
          <UniversalItem v-for="(item, key) in materialCalculationResult" :key="key" :data="item" />
        </div>
        <div v-else class="w-full">
          <p>無需素材</p>
        </div>
      </div>
    </div>
  </div>
  <!-- 詳細資訊彈窗（原左欄內容） -->
  <UModal
    v-model:open="detailOpen"
    title="詳細資訊"
    :close="{
      class:
        'text-parchment-100 hover:text-white hover:bg-white/10 active:text-white active:bg-white/20',
    }"
    :ui="{
      content:
        'bg-navy-900/85 backdrop-blur-lg text-parchment-100 border border-gold-500/30 divide-white/10',
      title: 'text-gold-300',
    }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <USeparator label="基本資料" :ui="{ label: 'text-parchment-100/90' }" />
        <div class="flex flex-col divide-y divide-white/10">
          <div class="flex flex-row justify-between items-center text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">元素</p>
            <NuxtImg
              :src="`${storageConfig.baseUrl}/elements/${getElementIcon(data)}.png`"
              :alt="data.element_text + '元素圖示'"
              width="30"
              height="30"
              placeholder
              v-if="data.element_type !== 'ELEMENT_NONE'"
            />
          </div>
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">武器</p>
            <p class="text-white">{{ data.weapon_text }}</p>
          </div>
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">所屬</p>
            <p class="text-white">{{ data.affiliation || "無" }}</p>
          </div>
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">命之座</p>
            <p class="text-white">{{ data.constellation?.name }}</p>
          </div>
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">生日</p>
            <p class="text-white">{{ data.birthday?.mmdd }}</p>
          </div>
        </div>
        <USeparator label="配音演員" :ui="{ label: 'text-parchment-100/90' }" />
        <div class="flex flex-col divide-y divide-white/10">
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">華語</p>
            <p class="text-white">{{ data.cv?.CHS }}</p>
          </div>
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">日語</p>
            <p class="text-white">{{ data.cv?.JP }}</p>
          </div>
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">英語</p>
            <p class="text-white">{{ data.cv?.EN }}</p>
          </div>
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">韓語</p>
            <p class="text-white">{{ data.cv?.KR }}</p>
          </div>
        </div>
        <USeparator label="衣裝" :ui="{ label: 'text-parchment-100/90' }" />
        <div class="flex flex-col gap-3">
          <USelect
            v-model="selectedOutfit"
            :items="outfitList"
            placeholder="選擇衣裝"
            class="w-full"
          />
          <div class="max-h-30 overflow-y-auto">
            <p>{{ outfitsObject[selectedOutfit as keyof outfitItem]?.description }}</p>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped></style>
