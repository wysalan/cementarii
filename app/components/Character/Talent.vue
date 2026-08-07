<script setup lang="ts">
import { objectFromEntries } from "ts-extras";
import type { character } from "@/generated/prisma/client";
const { data } = defineProps<{ data: character }>();

const emit = defineEmits<{ "update:railHidden": [value: boolean] }>();

import { useUserStore } from "@/stores/User";
const store = useUserStore();

interface Dictionary {
  relatedEffects: Record<string, string>;
  linkToEffect: Record<string, string>;
  linkToTalent: Record<string, string>;
  linkToPassive: Record<string, string>;
  linkToConstellation: Record<string, string>;
}

import useDataParser from "@/composables/useDataParser";
const { parseDescriptionText, parseTalentAttributes } = useDataParser();

const talentsList = Object.values(data.talents?.list || {});
const talentsNameList = Object.keys(data.talents?.list || {});
const dictionary: Dictionary | null = data.dictionary;

const skills = objectFromEntries([
  ["talents", Object.values(data.talents!.list)],
  ["passives", data.passives!],
  ["constellation", data.constellation?.list],
] as const);

// 天賦清單：戰鬥天賦＋固有天賦
const skillItems = [
  ...talentsList.map((talent, index) => ({
    name: talent.name,
    skill: talent,
    index,
    hasStats: true,
    special: talentsNameList[index]?.includes("Special") || false,
  })),
  ...(data.passives || []).map((passive) => ({
    name: passive.name,
    skill: passive,
    index: -1,
    hasStats: false,
    special: false,
  })),
];

const selected = ref<number | null>(null);
const selectedItem = computed(() => (selected.value === null ? null : skillItems[selected.value]));

// 手機／平板：資訊卡在清單下方，開啟後自動捲動至卡片
const detailEl = ref<HTMLElement | null>(null);
const scrollToDetail = () => {
  if (window.innerWidth < 1280) {
    detailEl.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

// 開啟天賦資訊時隱藏左側導覽軌
watch(selected, (value) => emit("update:railHidden", value !== null));
onActivated(() => emit("update:railHidden", selected.value !== null));
onDeactivated(() => emit("update:railHidden", false));

const talentsLevel = ref([
  store.defaultTalentLevel,
  store.defaultTalentLevel,
  store.defaultTalentLevel,
]);

const popupData = ref({
  title: "",
  name: "",
  description: "",
});

const dialogVisible = ref(false);

const handleInsideClick = (event: MouseEvent) => {
  const target = (event.target as Element)?.closest("[data-name]");
  if (!target) return;
  const type = (target as HTMLElement).dataset.type;
  const name = (target as HTMLElement).dataset.name;
  const talentsList = Object.fromEntries(skills.talents.map(({ name, ...rest }) => [name, rest]));
  const passivesList = Object.fromEntries(skills.passives.map(({ name, ...rest }) => [name, rest]));
  const constellationList = Object.fromEntries(
    skills.constellation?.map(({ name, ...rest }) => [name, rest]) || [],
  );
  if (type && name) {
    if (type === "talent") {
      popupData.value = {
        title: "相關突破天賦",
        name: name,
        description: talentsList[name]?.description || "",
      };
    } else if (type === "passive") {
      popupData.value = {
        title: "相關固有天賦",
        name: name,
        description: passivesList[name]?.description || "",
      };
    } else if (type === "constellation") {
      popupData.value = {
        title: "相關命之座",
        name: name,
        description: constellationList[name]?.description || "",
      };
    } else if (type === "effect") {
      popupData.value = {
        title: `相關效果 / ${name}`,
        name: name,
        description: dictionary?.relatedEffects[name] || "",
      };
    } else {
      popupData.value = {
        title: "錯誤",
        name: "無法取得資料",
        description: "尚未設定此效果說明",
      };
    }
    dialogVisible.value = true;
  }
};

const needMaterials = computed(() => {
  return (end = 10) => {
    const map = new Map();
    data.talents?.costs
      .slice(0, end - 1)
      .flat()
      .forEach((item) => {
        if (map.has(item.id)) {
          map.get(item.id)!.count += item.count;
        } else {
          map.set(item.id, { ...item });
        }
      });
    return [...map.values()].sort((a, b) => a.id - b.id);
  };
});
</script>

<template>
  <div class="max-xl:mx-4 max-xl:mt-[36vh] max-xl:mb-30 max-xl:flex max-xl:flex-col max-xl:gap-4">
    <!-- 右側：天賦清單（模仿遊戲內天賦介面，暫以菱形代替天賦圖示） -->
    <nav
      class="flex flex-col gap-2 xl:gap-6 xl:absolute xl:right-10 xl:top-[calc(50%+34px)] xl:-translate-y-1/2 xl:z-10"
      aria-label="天賦清單"
    >
      <button
        v-for="(item, i) in skillItems"
        :key="i"
        type="button"
        class="group relative flex items-center justify-between xl:justify-end gap-4 cursor-pointer max-xl:p-3 max-xl:rounded-lg max-xl:bg-navy-900/70 max-xl:backdrop-blur-sm max-xl:border max-xl:border-gold-500/30"
        :aria-current="selected === i ? 'true' : undefined"
        @click="selected = selected === i ? null : i"
      >
        <!-- hover／選中時的柔光橫帶（模仿遊戲內效果） -->
        <span
          class="absolute inset-0 xl:-left-16 xl:-right-10 xl:-inset-y-1 -z-10 rounded-lg xl:rounded-none bg-linear-to-r from-transparent to-transparent pointer-events-none transition-opacity duration-200"
          :class="
            selected === i
              ? 'opacity-100 via-white/25'
              : 'opacity-0 via-white/15 group-hover:opacity-100 group-active:opacity-100'
          "
        ></span>
        <span
          class="max-xl:text-left xl:text-right [text-shadow:0_1px_3px_rgba(0,0,0,0.55),0_2px_10px_rgba(0,0,0,0.45)]"
        >
          <span
            class="block text-sm md:text-base font-semibold transition-colors"
            :class="selected === i ? 'text-gold-300' : 'text-white/90 group-hover:text-gold-200'"
          >
            {{ item.name }}
          </span>
          <span
            v-if="item.hasStats && !item.special"
            class="block text-xs md:text-sm text-white/90"
          >
            Lv.{{ talentsLevel[item.index] }}
          </span>
        </span>
        <span
          class="flex shrink-0 items-center justify-center w-9 h-9 m-1.5 rotate-45 rounded-xs border-2 backdrop-blur-sm transition-colors"
          :class="
            selected === i
              ? 'bg-gold-400 border-gold-200 shadow-[0_0_12px_rgba(211,188,142,0.7)]'
              : 'bg-navy-900/70 border-white/40 group-hover:border-gold-300'
          "
        >
          <span
            class="w-3.5 h-3.5 rounded-xs"
            :class="selected === i ? 'bg-navy-900' : 'bg-white/70'"
          ></span>
        </span>
      </button>
    </nav>

    <!-- 左側：天賦資訊（介紹與屬性左右兩張卡片） -->
    <Transition name="talent-detail" mode="out-in" @after-enter="scrollToDetail">
      <div
        v-if="selectedItem"
        :key="selected ?? -1"
        ref="detailEl"
        class="grid grid-cols-1 gap-4 items-start scroll-mt-24 xl:absolute xl:left-10 xl:top-[calc(50%+34px)] xl:-translate-y-1/2 xl:z-10"
        :class="
          selectedItem.hasStats ? 'md:grid-cols-2 xl:grid-cols-[1fr_1.25fr] xl:w-200' : 'xl:w-96'
        "
      >
        <!-- 天賦介紹 -->
        <section
          class="bg-navy-900/75 backdrop-blur-md border border-gold-500/30 rounded-lg shadow-lg p-5 text-parchment-100 xl:max-h-[85vh] overflow-y-auto"
        >
          <div class="flex items-start justify-between gap-3 pb-4">
            <h2 class="gi-diamond text-lg md:text-xl font-semibold text-white">
              {{ selectedItem.name }}
            </h2>
            <button
              type="button"
              class="flex shrink-0 rounded-full p-1 text-parchment-100/80 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
              aria-label="關閉天賦資訊"
              @click="selected = null"
            >
              <UIcon name="i-lucide-x" class="size-5" />
            </button>
          </div>
          <p
            v-html="parseDescriptionText(selectedItem.skill.description, skills, dictionary)"
            class="text-sm md:text-base"
            @click="handleInsideClick"
          ></p>
        </section>
        <!-- 詳細屬性 -->
        <section
          v-if="selectedItem.hasStats"
          class="flex flex-col gap-3 bg-navy-900/75 backdrop-blur-md border border-gold-500/30 rounded-lg shadow-lg p-5 text-parchment-100 xl:max-h-[85vh] overflow-y-auto"
        >
          <h2 class="gi-diamond text-lg md:text-xl font-semibold text-white pb-1">詳細屬性</h2>
          <div class="flex flex-row items-center gap-5" v-if="!selectedItem.special">
            <div
              class="bg-gold-400 rounded-sm p-2 w-20 text-center select-none font-semibold text-navy-900"
            >
              Lv. <span class="font-bold">{{ talentsLevel[selectedItem.index] }}</span>
            </div>
            <USlider
              v-model="talentsLevel[selectedItem.index]"
              :min="1"
              :max="15"
              :step="1"
              class="w-full"
            />
          </div>
          <div
            class="flex flex-row justify-between text-sm md:text-base gap-15"
            v-for="prop in parseTalentAttributes(
              selectedItem.skill,
              talentsLevel[selectedItem.index] || 1,
            )"
          >
            <p class="font-semibold text-parchment-100/80">{{ prop.text }}</p>
            <p class="text-white text-right">{{ prop.value }}</p>
          </div>
          <div class="flex flex-col w-full gap-3" v-if="!selectedItem.special">
            <USeparator />
            <p class="text-base font-semibold text-white">所需素材</p>
            <div
              class="flex flex-row justify-start min-w-full overflow-x-auto gap-3"
              v-if="needMaterials(talentsLevel[selectedItem.index])?.toString().length"
            >
              <UniversalItem
                v-for="(item, key) in needMaterials(talentsLevel[selectedItem.index])"
                :data="item"
                :key="key"
              />
            </div>
            <div v-else>
              <p>無</p>
            </div>
          </div>
        </section>
      </div>
    </Transition>

    <UModal
      v-model:open="dialogVisible"
      :title="popupData.title"
      :close="{
        class:
          'text-parchment-100 hover:text-white hover:bg-white/10 active:text-white active:bg-white/20',
      }"
      :ui="{
        content:
          'max-w-[75vw] lg:max-w-[50vw] bg-navy-900/85 backdrop-blur-lg text-parchment-100 border border-gold-500/30 divide-white/10',
        title: 'text-gold-300',
      }"
    >
      <template #body>
        <div class="flex flex-col gap-5">
          <h2 class="text-lg md:text-xl font-semibold text-white">{{ popupData.name }}</h2>
          <p
            v-html="parseDescriptionText(popupData.description, skills, dictionary)"
            class="text-sm md:text-base"
          ></p>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.talent-detail-enter-active,
.talent-detail-leave-active {
  transition: opacity 0.2s ease;
}
.talent-detail-enter-from,
.talent-detail-leave-to {
  opacity: 0;
}
</style>
