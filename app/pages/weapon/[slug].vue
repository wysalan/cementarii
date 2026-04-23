<script setup lang="ts">
import { useRoute } from "vue-router";
import useDataParser from "@/composables/useDataParser";
import curve from "@/data/curve.json";

definePageMeta({
  layout: "detail",
});

const { slug } = useRoute().params;
const { data: weaponData, pending, error } = await useFetch(`/api/weapon/${slug}`);
const { parseDescriptionText, parseEffectDescription } = useDataParser();

// Type
interface Curve {
  [key: string]: {
    [key: string]: number;
  };
}

interface CurveItem {
  [key: string]: number;
}

interface Promotions {
  [key: string]: {
    maxlevel: number;
    attack: number;
  };
}

interface PromotionItem {
  [key: string]: {
    attack: number;
  };
}

// Weapon Level
const levelIndex = ref(6);
const levelTicks = [20, 40, 50, 60, 70, 80, 90];
const actualLevel = computed(() => {
  return levelTicks[levelIndex.value];
});
const calculatedStats = computed(() => {
  const weaponCurve: Curve = curve.weapons;
  const level: keyof Curve = actualLevel.value || 0;
  const promotions = ref<Promotions>();
  const baseStats = {
    atk: weaponData.value?.stats?.base.attack || 0,
    substat: weaponData.value?.stats?.base.substat || 0,
  };

  if (weaponData.value?.stats?.promotion) {
    promotions.value = Object.fromEntries(
      weaponData.value.stats?.promotion.map((promotion) => [promotion.maxlevel, promotion]),
    );
  }

  const result = ref({
    attack:
      baseStats.atk *
        (weaponCurve?.[level]?.[weaponData.value?.stats?.curve.attack as keyof CurveItem] || 0) +
      (promotions.value?.[level as keyof PromotionItem]?.attack || 0),
    substat:
      baseStats.substat *
      (weaponCurve?.[level]?.[weaponData.value?.stats?.curve.substat as keyof CurveItem] || 0),
  });

  return result.value;
});

// Weapon Refinement Rank
const refinementRankList = ref([
  { title: "精煉 1 階", rank: 1 },
  { title: "精煉 2 階", rank: 2 },
  { title: "精煉 3 階", rank: 3 },
  { title: "精煉 4 階", rank: 4 },
  { title: "精煉 5 階", rank: 5 },
]);
const selectedRefinementRank = ref(1);

const dialogVisible = ref(false);

// Material
const materialCalculationMethod = ref("累計");
const materialCalculationOption = ref(["單一", "累計"]);
const costsList = weaponData.value ? Object.values(weaponData.value!.costs!) : [];

const materialCalculationResult = computed(() => {
  if (materialCalculationMethod.value === "累計") {
    const map = new Map();
    costsList
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
    return costsList[levelIndex.value - 1];
  }
});

// Functions
function getBgColor(rarity: number | null) {
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

function getSubstatText(substat: string | undefined) {
  if (substat) {
    switch (substat) {
      case "FIGHT_PROP_ATTACK_PERCENT":
        return "攻擊力";
      case "FIGHT_PROP_DEFENSE_PERCENT":
        return "防禦力";
      case "FIGHT_PROP_HP_PERCENT":
        return "生命值";
      case "FIGHT_PROP_PHYSICAL_ADD_HURT":
        return "物理傷害加成";
      case "FIGHT_PROP_ELEMENT_MASTERY":
        return "元素精通";
      case "FIGHT_PROP_CHARGE_EFFICIENCY":
        return "元素充能效率";
      case "FIGHT_PROP_CRITICAL":
        return "暴擊率";
      case "FIGHT_PROP_CRITICAL_HURT":
        return "暴擊傷害";
      default:
        return "unknown";
    }
  }
  return "unknown";
}

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
  <main class="container mx-auto" v-if="weaponData">
    <div class="grid grid-cols-1 lg:grid-cols-10 h-90dvh gap-5 max-lg:mx-5 lg:mt-3">
      <div
        class="flex justify-center items-center w-full h-100 lg:h-full p-6 rounded-xl lg:col-span-6 xl:col-span-7 overflow-hidden"
        :class="getBgColor(weaponData.rarity)"
      >
        <NuxtImg
          :src="
            'https://assets.wysalan.com/cementarii/weapon-icon/' +
            weaponData.images?.Gacha_EquipIcon +
            '.webp'
          "
          :alt="weaponData.name"
          class="h-full rotate-20"
        />
      </div>
      <div
        class="flex flex-col gap-5 w-full h-full rounded-xl p-6 lg:col-span-4 xl:col-span-3 bg-zinc-200"
      >
        <div class="flex flex-col justify-start gap-5">
          <div class="flex flex-row justify-between">
            <p class="font-semibold text-lg">{{ weaponData.weapon_text }}</p>
            <Tag severity="contrast" class="select-none">Ver. {{ weaponData.version }}</Tag>
          </div>
          <div class="flex flex-row items-center gap-3">
            <NuxtImg
              :src="
                'https://assets.wysalan.com/cementarii/weapon-icon/' +
                weaponData.images?.EquipIcon +
                '.webp'
              "
              :alt="'武器圖示：' + weaponData.name"
              class="w-10 h-10 rounded-sm"
              :class="getBgColor(weaponData.rarity)"
            />
            <h2 class="text-2xl font-semibold">{{ weaponData.name }}</h2>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <div class="flex flex-row justify-between">
            <div class="flex flex-col w-30 text-left">
              <p class="font-semibold opacity-60">基礎攻擊力</p>
              <p class="text-2xl font-bold">{{ calculatedStats.attack.toFixed(0) }}</p>
            </div>
            <div class="flex flex-col text-right w-30">
              <p class="font-semibold opacity-60">
                {{ getSubstatText(weaponData.stats?.type.substat) }}
              </p>
              <p class="text-2xl font-bold">
                {{ getSubstatValue(weaponData.stats?.type.substat, calculatedStats.substat) }}
              </p>
            </div>
          </div>
        </div>
        <div class="flex flex-row items-center gap-5">
          <div class="bg-zinc-300 rounded-sm p-2 w-25 text-center select-none font-semibold">
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
        <div class="flex flex-col justify-start items-center gap-3">
          <div class="flex flex-row justify-between items-center w-full">
            <h2 class="text-xl font-semibold dark:text-white">
              所需素材
              <i
                class="pi pi-question-circle"
                v-tooltip.top="{
                  value: '將武器升至 ' + actualLevel + ' 級所需要的素材',
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
            class="flex flex-row justify-start max-w-full overflow-x-auto gap-3 pb-2 overflow-y-hidden"
            v-if="materialCalculationResult?.toString().length"
          >
            <UniversalItem
              v-for="(item, key) in materialCalculationResult"
              :key="key"
              :data="item"
            />
          </div>
          <div v-else class="w-full">
            <p class="">無需材料</p>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <div class="flex flex-row justify-between items-center w-full">
            <h3 class="text-xl font-semibold">{{ weaponData.effect?.text.name }}</h3>
            <Select
              v-model="selectedRefinementRank"
              :options="refinementRankList"
              optionLabel="title"
              optionValue="rank"
              placeholder="選擇精煉等階"
              class="w-fit"
            />
          </div>
          <p
            v-html="parseEffectDescription(weaponData.effect, selectedRefinementRank)"
            class="lg:text-lg"
          ></p>
        </div>
        <div class="text-left">
          <p class="opacity-90">{{ weaponData.description }}</p>
        </div>
        <div>
          <Button
            label="故事"
            icon="pi pi-exclamation-circle"
            fluid
            @click="dialogVisible = !dialogVisible"
          />
        </div>
      </div>
    </div>
    <Dialog
      v-model:visible="dialogVisible"
      modal
      header="故事"
      class="w-90vw lg:max-w-fit text-white"
      :pt="{
        root: { class: 'bg-zinc-600/70 backdrop-blur-lg' },
        header: { class: 'border-b-2 opacity-80 mb-5 py-2' },
        pcCloseButton: { root: { class: 'text-white! hover:bg-zinc-400!' } },
      }"
    >
      <div class="flex flex-col gap-5">
        <p v-html="parseDescriptionText(weaponData.story || '')" class="text-lg"></p>
      </div>
    </Dialog>
  </main>
  <main v-else>
    <div class="container mx-auto pt-5 pb-10">
      <p class="text-lg">目前無此武器資料，或是連接資料庫時發生錯誤</p>
      <p class="text-lg" v-if="error">
        錯誤訊息：{{ error?.statusMessage }} (Status code: {{ error?.statusCode }})
      </p>
    </div>
  </main>
</template>

<style scoped></style>
