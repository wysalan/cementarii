<script setup lang="ts">
import { useRoute } from "vue-router";
import { siteConfig, storageConfig } from "@/site.config";
import curve from "@/data/curve.json";
import { useUserStore } from "@/stores/User";
const store = useUserStore();

definePageMeta({
  layout: "detail",
});

const dialogVisible = ref(false);

// 取得資料
const { locale, t } = useI18n();
const { slug } = useRoute().params;
const event = useRequestEvent();
const {
  data: weaponData,
  status,
  error,
} = await useFetch(`/api/weapon/${slug}`, {
  query: { locale },
});

if (event && error.value?.status === 404) {
  setResponseStatus(event, 404);
}

// SEO
const title = computed(
  () => `${weaponData.value?.name || t("weapon.notFoundTitle")} | ${siteConfig.title}`,
);

useSeoMeta({ title });

// 型別
interface Curve {
  [key: string]: {
    [key: string]: number;
  };
}

// 武器數值顯示
const levelTicks = weaponData.value?.stats.promotions.map((p) => p.maxLevel) ?? [];
const levelIndex = ref(levelTicks.length - 1);
const actualLevel = computed(() => levelTicks[levelIndex.value]);
const calculatedStats = computed(() => {
  const weapon = weaponData.value;
  const level = actualLevel.value;
  if (!weapon || !level) return { attack: 0, substat: 0 };

  const weaponCurve: Curve = curve.weapons;
  const promotion = weapon.stats.promotions.find((p) => p.maxLevel === level);

  return {
    attack:
      weapon.stats.base.attack * (weaponCurve[level]?.[weapon.stats.curves.attack] ?? 0) +
      (promotion?.attack ?? 0),
    substat: weapon.stats.base.substat * (weaponCurve[level]?.[weapon.stats.curves.substat] ?? 0),
  };
});

// 精煉等級
const refinementRankList = computed(() =>
  [1, 2, 3, 4, 5].map((rank) => ({ label: t("weapon.refinement", { rank }), value: rank })),
);
const selectedRefinementRank = ref(1);

// 養成素材
const materialCalculationMethod = ref<"single" | "cumulative">("cumulative");
const materialCalculationOption = computed(() => [
  { label: t("common.materials.method.single"), value: "single" },
  { label: t("common.materials.method.cumulative"), value: "cumulative" },
]);

const materialCalculationResult = computed(() => {
  const costs = weaponData.value?.costs ?? [];
  return materialCalculationMethod.value === "single"
    ? sumMaterials(costs.filter((c) => c.stage === levelIndex.value))
    : sumMaterials(costs.filter((c) => c.stage <= levelIndex.value));
});

// Functions
function getBgColor(rarity: number | null) {
  if (rarity) {
    switch (rarity) {
      case 1:
        return "bg-linear-to-b from-[#6a6d74] to-[#868586]";
      case 2:
        return "bg-linear-to-b from-[#4b6c67] to-[#519072]";
      case 3:
        return "bg-linear-to-b from-[#567496] to-[#5392b8]";
      case 4:
        return "bg-linear-to-b from-[#5e5789] to-[#9c75b7]";
      case 5:
        return "bg-linear-to-b from-[#945c2c] to-[#b27330]";
    }
  }
}
</script>

<template>
  <main class="container mx-auto mb-6 mt-3" v-if="status === 'success' && weaponData">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 mx-4 sm:mx-5">
      <div
        class="flex justify-center items-center w-full h-[50dvh] lg:h-[calc(100dvh-6.5rem)] p-6 rounded-xl lg:col-span-8 overflow-hidden"
        :class="getBgColor(weaponData.rarity)"
      >
        <NuxtImg
          :src="`${storageConfig.baseUrl}/weapon-icon/${weaponData.images?.gacha}.webp`"
          :alt="weaponData.name"
          class="h-full rotate-20"
        />
      </div>
      <div
        class="flex flex-col gap-5 w-full lg:h-[calc(100dvh-6.5rem)] rounded-xl p-6 lg:col-span-4 gi-panel overflow-y-auto"
      >
        <div class="flex flex-col justify-start gap-5">
          <div class="flex flex-row justify-between">
            <p class="font-semibold text-base md:text-lg">
              {{ t(`weaponType.${weaponData.weaponType}`) }}
            </p>
            <UBadge color="primary" variant="soft" class="select-none">
              Ver. {{ weaponData.releasedIn }}
            </UBadge>
          </div>
          <div class="flex flex-row items-center gap-3">
            <NuxtImg
              :src="`${storageConfig.baseUrl}/weapon-icon/${weaponData.images?.icon}.webp`"
              :alt="t('weapon.iconAlt', { name: weaponData.name })"
              class="w-10 h-10 rounded-sm"
              :class="getBgColor(weaponData.rarity)"
            />
            <h2 class="text-xl md:text-2xl font-semibold text-highlighted">
              {{ weaponData.name }}
            </h2>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <div class="flex flex-row justify-between">
            <div class="flex flex-col w-30 text-left">
              <p class="font-semibold opacity-60 text-sm md:text-base">
                {{ t("weapon.baseAttack") }}
              </p>
              <p class="text-xl md:text-2xl font-bold">{{ calculatedStats.attack.toFixed(0) }}</p>
            </div>
            <div class="flex flex-col text-right w-30">
              <p class="font-semibold opacity-60 text-sm md:text-base">
                {{ t(`fightProp.${weaponData.substatType}`) }}
              </p>
              <p class="text-xl md:text-2xl font-bold">
                {{ formatStatValue(weaponData.substatType, calculatedStats.substat) }}
              </p>
            </div>
          </div>
        </div>
        <div class="flex flex-row items-center gap-5">
          <div
            class="bg-gold-400 text-navy-900 rounded-sm p-2 w-25 text-center select-none font-semibold"
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
        <div class="flex flex-col justify-start items-center gap-3">
          <div class="flex flex-row justify-between items-center w-full">
            <h2
              class="gi-diamond text-base md:text-lg font-semibold text-highlighted flex items-center gap-1"
            >
              {{ t("common.materials.title") }}
              <UTooltip
                :text="
                  materialCalculationMethod === 'single'
                    ? t('weapon.materials.hint.single', {
                        from: levelTicks[levelIndex - 1] || 1,
                        to: actualLevel,
                      })
                    : t('weapon.materials.hint.cumulative', { to: actualLevel })
                "
              >
                <UIcon name="i-lucide-circle-help" class="size-4 text-muted" />
              </UTooltip>
            </h2>
            <USelect
              v-model="materialCalculationMethod"
              :items="materialCalculationOption"
              :aria-label="t('common.materials.methodLabel')"
            />
          </div>
          <UniversalItemStrip
            v-if="materialCalculationResult.length"
            :items="materialCalculationResult"
          />
          <div v-else class="w-full">
            <p>{{ t("common.noMaterials") }}</p>
          </div>
        </div>
        <div class="flex flex-col gap-3" v-if="weaponData.effectName">
          <div class="flex flex-row justify-between items-center w-full">
            <h3 class="gi-diamond text-lg md:text-xl font-semibold text-highlighted">
              {{ weaponData.effectName }}
            </h3>
            <USelect
              v-model="selectedRefinementRank"
              :items="refinementRankList"
              :aria-label="t('weapon.refinementLabel')"
              class="w-fit"
            />
          </div>
          <p
            v-html="
              parseEffectDescription(
                weaponData.effectDescription,
                weaponData.refinementParams,
                selectedRefinementRank,
              )
            "
            class="text-sm md:text-base"
          ></p>
        </div>
        <div class="text-left">
          <p class="text-sm md:text-base opacity-90">{{ weaponData.description }}</p>
        </div>
        <div>
          <UButton
            :label="t('weapon.story')"
            icon="i-lucide-book-open"
            color="primary"
            variant="solid"
            block
            @click="dialogVisible = !dialogVisible"
          />
        </div>
      </div>
    </div>
    <UModal
      v-model:open="dialogVisible"
      :title="t('weapon.story')"
      :close="{
        class:
          'text-navy-700 hover:text-navy-900 hover:bg-black/5 active:bg-black/10 dark:text-parchment-100 dark:hover:text-white dark:hover:bg-white/10 dark:active:text-white dark:active:bg-white/20',
      }"
      :ui="{
        content:
          'max-w-[90vw] lg:max-w-3xl backdrop-blur-lg bg-parchment-100/90 text-navy-700 border border-gold-600/40 divide-navy-900/10 dark:bg-navy-900/85 dark:text-parchment-100 dark:border-gold-500/30 dark:divide-white/10',
        title: 'text-gold-700 dark:text-gold-300',
      }"
    >
      <template #body>
        <p
          v-html="parseStoryContent(weaponData.story, store.name, store.playerGender)"
          class="text-sm md:text-base"
        ></p>
      </template>
    </UModal>
  </main>
  <main v-else>
    <div class="container mx-auto pt-5 pb-10 px-4">
      <div class="flex flex-col items-center" v-if="error?.status == 404">
        <p>{{ t("weapon.notFound") }}</p>
      </div>
      <div class="flex flex-col items-center" v-else>
        <p>{{ t("common.error.server") }}</p>
        <p>{{ t("common.error.statusCode", { code: error?.status }) }}</p>
        <p>{{ t("common.error.statusText", { message: error?.statusText }) }}</p>
      </div>
    </div>
  </main>
</template>

<style scoped></style>
