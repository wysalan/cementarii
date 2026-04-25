<script setup lang="ts">
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
    sp: promotions.value?.[(level >= 90 ? 90 : level) as keyof PromotionItem]?.specialized || 0,
  });

  return result.value;
});

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
      return substat;
    }
    return (substat * 100).toFixed(1) + "%";
  }
}
</script>

<template>
  <!-- 右側：角色數值 -->
  <div
    class="xl:absolute xl:right-2% xl:top-1/2 xl:translate-[-2%,-50%] xl:z-5 max-xl:mt-36vh max-h-full overflow-y-auto"
  >
    <div
      class="flex flex-col dark:bg-zinc-700/40 bg-white/80 rounded-md backdrop-blur-sm h-fit w-full xl:w-100 p-5 gap-5 shadow-md dark:text-white"
    >
      <div class="flex flex-row justify-start items-center gap-3">
        <NuxtImg
          :src="
            'https://assets.wysalan.com/cementarii/avatar-icon/' + outfitImgs?.AvatarIcon + '.webp'
          "
          class="w-15 h-15 rounded-sm"
          :class="
            data.rarity === 4
              ? 'bg-linear-to-b from-#5e5789 to-#9c75b7'
              : 'bg-linear-to-b from-#945c2c to-#b27330'
          "
        />
        <div class="text-left dark:text-white">
          <h2 class="text-2xl font-semibold">{{ data.name }}</h2>
          <p class="text-lg">{{ data.title }}</p>
        </div>
      </div>
      <div class="font-semibold text-left opacity-70">
        {{ data.description }}
      </div>
      <div class="flex flex-row items-center gap-5">
        <div
          class="bg-zinc-300 rounded-sm p-2 w-25 text-center select-none font-semibold dark:text-zinc-950"
        >
          Lv. <span class="font-bold">{{ actualLevel }}</span>
        </div>
        <Slider
          v-model="levelIndex"
          :min="0"
          :max="levelTicks.length - 1"
          :step="1"
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-5">
        <div class="flex flex-row justify-between text-lg">
          <p class="font-semibold text-zinc-950 dark:text-white opacity-80">生命值上限</p>
          <p>{{ calculatedStats.hp.toFixed(0) }}</p>
        </div>
        <div class="flex flex-row justify-between text-lg">
          <p class="font-semibold text-zinc-950 dark:text-white opacity-80">攻擊力</p>
          <p>{{ calculatedStats.atk.toFixed(0) }}</p>
        </div>
        <div class="flex flex-row justify-between text-lg">
          <p class="font-semibold text-zinc-950 dark:text-white opacity-80">防禦力</p>
          <p>{{ calculatedStats.def.toFixed(0) }}</p>
        </div>
        <div class="flex flex-row justify-between text-lg">
          <p class="font-semibold text-zinc-950 dark:text-white opacity-80">
            {{ data.stats?.substat.text }}
          </p>
          <p>{{ getSubstatValue(data.stats?.substat.type, calculatedStats.sp) }}</p>
        </div>
      </div>
    </div>
    <div
      class="flex flex-col dark:bg-black/30 bg-white/80 rounded-md backdrop-blur-sm h-fit w-full xl:w-100 p-5 gap-5 mt-5 shadow-md"
    >
      <div class="flex flex-col justify-start items-center gap-3">
        <div class="flex flex-row justify-between items-center w-full">
          <h2 class="text-xl font-semibold dark:text-white">
            升級所需素材
            <i
              class="pi pi-question-circle"
              v-tooltip.top="{
                value: '將角色升至 ' + actualLevel + ' 級所需要的素材',
                pt: { text: 'text-center' },
              }"
            ></i>
          </h2>
          <Select
            v-model="materialCalculationMethod"
            :options="materialCalculationOption"
            placeholder="選擇計算方式"
          />
        </div>
        <div
          class="flex flex-row justify-start max-w-full overflow-x-auto gap-3"
          v-if="materialCalculationResult?.toString().length"
        >
          <UniversalItem v-for="(item, key) in materialCalculationResult" :key="key" :data="item" />
        </div>
        <div v-else class="w-full">
          <p class="">無需材料</p>
        </div>
      </div>
    </div>
  </div>
  <div
    class="xl:absolute xl:left-2% xl:top-1/2 xl:translate-[2%,-50%] xl:z-5 max-xl:mt-5 max-h-full overflow-y-auto"
  >
    <div
      class="flex flex-col dark:bg-black/30 bg-white/80 rounded-md backdrop-blur-sm h-fit w-full xl:w-80 2xl:w-100 p-5 gap-5 shadow-md"
    >
      <div class="flex flex-row justify-start items-center gap-3">
        <div class="flex flex-row justify-between w-full">
          <h2 class="text-xl font-semibold dark:text-white">基礎資料</h2>
          <Tag severity="contrast" class="select-none">Ver. {{ data.version }}</Tag>
        </div>
      </div>
      <div class="flex flex-col gap-5">
        <div class="flex flex-row justify-between text-lg">
          <p class="font-semibold text-zinc-950 dark:text-white opacity-80">元素</p>
          <p class="flex flex-row justify-center items-center gap-1">
            <NuxtImg
              :src="
                'https://assets.wysalan.com/cementarii/elements/' + getElementIcon(data) + '.png'
              "
              :alt="data.element_text + '元素圖示'"
              width="30"
              height="30"
              placeholder
              v-if="data.element_type !== 'ELEMENT_NONE'"
            />
          </p>
        </div>
        <div class="flex flex-row justify-between text-lg">
          <p class="font-semibold text-zinc-950 dark:text-white opacity-80">武器</p>
          <p>{{ data.weapon_text }}</p>
        </div>
        <div class="flex flex-row justify-between text-lg">
          <p class="font-semibold text-zinc-950 dark:text-white opacity-80">所屬</p>
          <p>{{ data.affiliation || "無" }}</p>
        </div>
        <div class="flex flex-row justify-between text-lg">
          <p class="font-semibold text-zinc-950 dark:text-white opacity-80">命之座</p>
          <p>{{ data.constellation?.name }}</p>
        </div>
        <div class="flex flex-row justify-between text-lg">
          <p class="font-semibold text-zinc-950 dark:text-white opacity-80">生日</p>
          <p>{{ data.birthday?.mmdd }}</p>
        </div>
        <Divider
          align="center"
          :pt="{ root: { class: 'm-0' }, content: { class: 'bg-transparent' } }"
        >
          <strong>配音演員</strong>
        </Divider>
        <div class="flex flex-row justify-between text-lg">
          <p class="font-semibold text-zinc-950 dark:text-white opacity-80">華語</p>
          <p>{{ data.cv?.CHS }}</p>
        </div>
        <div class="flex flex-row justify-between text-lg">
          <p class="font-semibold text-zinc-950 dark:text-white opacity-80">日語</p>
          <p>{{ data.cv?.JP }}</p>
        </div>
        <div class="flex flex-row justify-between text-lg">
          <p class="font-semibold text-zinc-950 dark:text-white opacity-80">英語</p>
          <p>{{ data.cv?.EN }}</p>
        </div>
        <div class="flex flex-row justify-between text-lg">
          <p class="font-semibold text-zinc-950 dark:text-white opacity-80">韓語</p>
          <p>{{ data.cv?.KR }}</p>
        </div>
      </div>
    </div>
    <div
      class="flex flex-col dark:bg-black/30 bg-white/80 rounded-md backdrop-blur-sm h-fit w-full xl:w-80 2xl:w-100 p-5 gap-5 mt-5 mb-30 xl:mb-0 shadow-md"
    >
      <div class="flex flex-col gap-5">
        <div class="flex flex-row items-center text-lg gap-5">
          <p class="font-semibold text-zinc-950 dark:text-white opacity-80 min-w-fit">衣裝</p>
          <Select
            v-model="selectedOutfit"
            :options="outfitList"
            placeholder="選擇衣裝"
            :pt="{ root: { class: 'h-fit' }, label: { class: 'py-1' } }"
            class="w-full"
          >
            <template #empty> 無 </template>
          </Select>
        </div>
        <div class="max-h-30 overflow-y-auto">
          <p>{{ outfitsObject[selectedOutfit as keyof outfitItem]?.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
