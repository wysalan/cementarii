<script setup lang="ts">
import { storageConfig } from "@/site.config";
import { useUserStore } from "@/stores/User";

interface Item {
  id: number;
  name: string;
  rarity: number;
  icon: string;
  count: number;
}

const { data } = defineProps<{ data: Item }>();
const store = useUserStore();
const { locale, t } = useI18n();
const dialogVisible = ref(false);

// 類型、描述與來源等到第一次打開視窗才抓，避免一頁幾十個素材各發一次請求
const {
  data: detail,
  status,
  error,
  execute,
} = useLazyFetch(() => `/api/material/${data.id}`, {
  query: { locale },
  immediate: false,
  watch: false,
});
watch(dialogVisible, (open) => {
  if (open && !detail.value) execute();
});
// 遮罩會傳送到 body，無法繼承祖先的 .dark；依按鈕所在區域判斷是否強制深色
// （不可綁 dialogVisible，否則關閉動畫期間會先退回淺色）
const btnEl = ref<HTMLElement | null>(null);
const overlayClass = computed(() => (btnEl.value?.closest(".dark") ? "dark" : ""));
</script>

<template>
  <UTooltip :text="data.name">
    <button
      ref="btnEl"
      type="button"
      class="flex flex-col justify-center items-center bg-parchment-200 rounded-md min-w-18 m-1 cursor-pointer hover:ring-2 ring-gold-500 transition-shadow"
      @click="dialogVisible = !dialogVisible"
    >
      <!-- grow：按鈕被外層 flex 拉伸時由圖示區吃掉多餘高度，避免頂部露出底色 -->
      <div
        class="flex justify-center items-center w-full grow min-h-16 rounded-t-md bg-linear-to-br"
        :class="rarityGradient(data.rarity)"
      >
        <NuxtImg
          :src="`${storageConfig.baseUrl}/item-icon/${data.icon}.webp`"
          :alt="data.name"
          class="w-15 h-15"
          placeholder
        />
      </div>
      <div class="flex flex-col justify-center items-center h-8 w-full">
        <p class="text-navy-800">{{ data.count }}</p>
      </div>
    </button>
  </UTooltip>
  <UModal v-model:open="dialogVisible" :ui="{ overlay: overlayClass, content: 'max-w-lg ring-0' }">
    <template #content>
      <div class="flex flex-col h-fit rounded-lg overflow-hidden">
        <div
          class="flex flex-row justify-between items-center px-5 py-2"
          :class="rarityBar(data.rarity)"
        >
          <p class="text-base md:text-lg font-semibold text-white">
            {{ data.name }}
          </p>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            class="text-white hover:text-white hover:bg-white/20 active:text-white active:bg-white/30"
            aria-label="關閉視窗"
            @click="dialogVisible = false"
          />
        </div>
        <div
          class="flex justify-center items-center h-50 relative bg-linear-to-br"
          :class="rarityGradient(data.rarity)"
        >
          <NuxtImg
            :src="`${storageConfig.baseUrl}/item-icon/${data.icon}.webp`"
            class="w-45 h-45 max-md:py-5 object-contain"
          />
          <div class="absolute top-3 left-5 flex">
            <p class="select-none text-white font-semibold opacity-90 text-sm md:text-base">
              {{ detail?.typeText }}
            </p>
          </div>
          <div class="absolute bottom-3 left-5 flex flex-row gap-1">
            <p
              class="select-none text-yellow-400 font-semibold text-sm md:text-base"
              v-for="n in data.rarity"
            >
              ★
            </p>
          </div>
        </div>
        <div
          class="flex flex-col gap-5 bg-parchment-200 p-5 h-full text-navy-800 max-lg:max-h-[30vh] max-h-[50vh] overflow-y-auto"
        >
          <div v-if="status === 'error'" role="alert" class="text-sm md:text-base">
            <p v-if="error?.status === 404">目前無此素材資料</p>
            <p v-else>{{ t("common.error.server") }}</p>
          </div>
          <div
            v-else-if="!detail"
            class="flex flex-col gap-2"
            role="status"
            aria-label="素材資料載入中"
          >
            <USkeleton v-for="i in 3" :key="i" class="h-5 bg-parchment-300" />
          </div>
          <div class="flex flex-col gap-3" v-if="detail">
            <p
              v-html="parseStoryContent(detail.description, store.name, store.playerGender)"
              class="text-sm md:text-base opacity-80"
            ></p>
          </div>
          <div class="flex flex-col gap-3" v-if="detail?.sources?.length">
            <p class="flex items-center gap-1 font-semibold text-sm md:text-base">
              <UIcon name="i-lucide-map-pin" />來源
            </p>
            <div
              class="rounded-md border-2 border-parchment-300 p-3"
              v-for="source in detail.sources"
            >
              <p class="text-sm md:text-base">{{ source }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped></style>
