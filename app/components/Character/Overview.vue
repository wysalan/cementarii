<script setup lang="ts">
import { storageConfig } from "@/site.config";
import curve from "@/data/curve.json";
import type { CharacterData } from "@/types/api";
const { data } = defineProps<{ data: CharacterData }>();
const { t } = useI18n();

interface Curve {
  [key: string]: {
    [key: string]: number;
  };
}

const detailOpen = ref(false);

// 角色衣裝
const outfitList = defineModel<string[]>("outfitList");
const selectedOutfit = defineModel<string>("selectedOutfit");
const outfitImgs = defineModel<Record<string, string>>("outfitImgs");

const outfitsObject = data.outfits
  ? Object.fromEntries(data.outfits.map((outfit) => [outfit.name, outfit]))
  : {};

// 角色數值
const levelIndex = ref(6);
const levelTicks = [20, 40, 50, 60, 70, 80, 90, 95, 100];

const actualLevel = computed(() => {
  return levelTicks[levelIndex.value];
});

const calculatedStats = computed(() => {
  const characterCurve: Curve = curve.characters;
  const level: keyof Curve = actualLevel.value || 0;
  const promotions = data.stats.promotions.find((p) => p.maxLevel === Math.min(level, 90));
  const baseStats = {
    hp: data.stats?.base.hp || 0,
    atk: data.stats?.base.attack || 0,
    def: data.stats?.base.defense || 0,
    stat: data.stats?.base.ascensionStat || 0,
  };

  const result = {
    hp:
      baseStats.hp * (characterCurve?.[level]?.[data.stats.curves.hp] || 0) + (promotions?.hp || 0),
    atk:
      baseStats.atk * (characterCurve?.[level]?.[data.stats.curves.attack] || 0) +
      (promotions?.attack || 0),
    def:
      baseStats.def * (characterCurve?.[level]?.[data.stats.curves.defense] || 0) +
      (promotions?.defense || 0),
    subStat: baseStats.stat + (promotions?.ascensionStat || 0),
  };

  return result;
});

// 養成素材
const materialCalculationMethod = ref<"single" | "cumulative">("cumulative");
const materialCalculationOption = computed(() => [
  { label: t("common.materials.method.single"), value: "single" },
  { label: t("common.materials.method.cumulative"), value: "cumulative" },
]);

const materialCalculationResult = computed(() => {
  if (materialCalculationMethod.value === "single") {
    return sumMaterials(data.costs.ascension.filter((s) => s.stage === levelIndex.value));
  } else {
    return sumMaterials(data.costs.ascension.filter((s) => s.stage <= levelIndex.value));
  }
});
</script>

<template>
  <!-- 右側：角色數值 -->
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
          Ver. {{ data.releasedIn }}
        </UBadge>
      </div>
      <div class="font-semibold text-left text-parchment-100/70 text-sm md:text-base">
        {{ data.description }}
      </div>
      <div class="flex flex-row items-center gap-5">
        <div
          class="bg-gold-400 rounded-sm p-1 w-25 text-center select-none font-semibold text-navy-900"
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
          <p class="font-semibold text-parchment-100/80">
            {{ t("character.overview.stats.hp") }}
          </p>
          <p class="text-white">{{ calculatedStats.hp.toFixed(0) }}</p>
        </div>
        <div class="flex flex-row justify-between text-sm md:text-base py-2.5">
          <p class="font-semibold text-parchment-100/80">
            {{ t("character.overview.stats.atk") }}
          </p>
          <p class="text-white">{{ calculatedStats.atk.toFixed(0) }}</p>
        </div>
        <div class="flex flex-row justify-between text-sm md:text-base py-2.5">
          <p class="font-semibold text-parchment-100/80">
            {{ t("character.overview.stats.def") }}
          </p>
          <p class="text-white">{{ calculatedStats.def.toFixed(0) }}</p>
        </div>
        <div class="flex flex-row justify-between text-sm md:text-base py-2.5">
          <p class="font-semibold text-parchment-100/80">
            {{ t(`fightProp.${data.stats?.ascensionStat}`) }}
          </p>
          <p class="text-white">
            {{ formatStatValue(data.stats.ascensionStat, calculatedStats.subStat) }}
          </p>
        </div>
      </div>
    </div>
    <button
      type="button"
      class="block w-full xl:w-100 mt-4 rounded-full border border-parchment-100/50 bg-navy-900/60 backdrop-blur-md py-2 text-parchment-100 font-semibold hover:bg-parchment-100/25 hover:text-white transition-colors cursor-pointer"
      @click="detailOpen = true"
    >
      {{ t("character.overview.details") }}
    </button>
    <div
      class="flex flex-col bg-navy-900/75 backdrop-blur-md border border-gold-500/30 rounded-lg h-fit w-full xl:w-100 p-5 gap-5 mt-4 shadow-lg text-parchment-100"
    >
      <div class="flex flex-col justify-start items-center gap-3">
        <div class="flex flex-row justify-between items-center w-full">
          <h2
            class="gi-diamond text-base md:text-lg font-semibold text-white flex items-center gap-1"
          >
            {{ t("common.materials.title") }}
            <UTooltip
              :text="
                materialCalculationMethod === 'single'
                  ? t('character.overview.materials.hint.single', {
                      from: levelTicks[levelIndex - 1] || 1,
                      to: actualLevel,
                    })
                  : t('character.overview.materials.hint.cumulative', { to: actualLevel })
              "
              :ui="{ content: 'dark' }"
            >
              <UIcon name="i-lucide-circle-help" class="size-4 text-muted" />
            </UTooltip>
          </h2>
          <USelect
            v-model="materialCalculationMethod"
            :items="materialCalculationOption"
            :aria-label="t('common.materials.methodLabel')"
            :ui="{ content: 'dark' }"
          />
        </div>
        <UniversalItemStrip
          v-if="materialCalculationResult?.length"
          :items="materialCalculationResult"
        />
        <div v-else class="w-full">
          <p>{{ t("common.noMaterials") }}</p>
        </div>
      </div>
    </div>
  </div>
  <!-- 詳細資訊彈出式視窗 -->
  <UModal
    v-model:open="detailOpen"
    :title="t('character.overview.details')"
    :close="{
      class:
        'text-parchment-100 hover:text-white hover:bg-white/10 active:text-white active:bg-white/20',
    }"
    :ui="{
      overlay: 'dark',
      content:
        'dark bg-navy-900/85 backdrop-blur-lg text-parchment-100 ring-0 border border-gold-500/30 divide-white/10',
      title: 'text-gold-300',
    }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <USeparator
          :label="t('character.overview.profile.title')"
          :ui="{ label: 'text-parchment-100/90' }"
        />
        <div class="flex flex-col divide-y divide-white/10">
          <div class="flex flex-row justify-between items-center text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">
              {{ t("character.overview.profile.element") }}
            </p>
            <NuxtImg
              :src="`${storageConfig.baseUrl}/elements/${data.element}.png`"
              :alt="
                t('character.overview.profile.elementIcon', {
                  element: t(`element.${data.element}`),
                })
              "
              width="30"
              height="30"
              placeholder
            />
          </div>
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">
              {{ t("character.overview.profile.weapon") }}
            </p>
            <p class="text-white">{{ t(`weaponType.${data.weaponType}`) }}</p>
          </div>
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">
              {{ t("character.overview.profile.affiliation") }}
            </p>
            <p class="text-white">{{ data.affiliation || t("common.none") }}</p>
          </div>
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">
              {{ t("character.overview.profile.constellation") }}
            </p>
            <p class="text-white">{{ data.constellationName }}</p>
          </div>
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">
              {{ t("character.overview.profile.birthday") }}
            </p>
            <p class="text-white">
              {{ data.birthMonth ? `${data.birthMonth}/${data.birthDay}` : "-" }}
            </p>
          </div>
        </div>
        <USeparator
          :label="t('character.overview.voiceActors.title')"
          :ui="{ label: 'text-parchment-100/90' }"
        />
        <div class="flex flex-col divide-y divide-white/10">
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">
              {{ t("character.overview.voiceActors.zhCN") }}
            </p>
            <p class="text-white">{{ data.voiceActors?.zhCN }}</p>
          </div>
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">
              {{ t("character.overview.voiceActors.ja") }}
            </p>
            <p class="text-white">{{ data.voiceActors?.ja }}</p>
          </div>
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">
              {{ t("character.overview.voiceActors.en") }}
            </p>
            <p class="text-white">{{ data.voiceActors?.en }}</p>
          </div>
          <div class="flex flex-row justify-between text-sm md:text-base py-2">
            <p class="font-semibold text-parchment-100/80">
              {{ t("character.overview.voiceActors.ko") }}
            </p>
            <p class="text-white">{{ data.voiceActors?.ko }}</p>
          </div>
        </div>
        <USeparator
          :label="t('character.overview.outfit.title')"
          :ui="{ label: 'text-parchment-100/90' }"
        />
        <div class="flex flex-col gap-3">
          <USelect
            v-model="selectedOutfit"
            :items="outfitList"
            :placeholder="t('character.overview.outfit.placeholder')"
            class="w-full"
            :ui="{ content: 'dark' }"
          />
          <div class="max-h-30 overflow-y-auto">
            <p class="text-sm md:text-base" v-if="selectedOutfit">
              {{ outfitsObject[selectedOutfit]?.description }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped></style>
