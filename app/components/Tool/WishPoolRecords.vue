<script setup lang="ts">
// 一個卡池的 5 星紀錄與各版本抽數；顯示模式與強調 UP 每個卡池各自設定
const { fives, versions, items, hasUp, weapon } = defineProps<{
  /** 由舊到新 */
  fives: AnnotatedWishRecord[];
  versions: WishVersionSummary[];
  items: Map<number, WishItem>;
  /** 有紀錄知道是不是 UP，才顯示顏色的說明與強調 UP 的開關 */
  hasUp?: boolean;
  weapon?: boolean;
}>();

const FIVE_MODES = [
  { value: "detail", label: "詳細" },
  { value: "compact", label: "精簡" },
] as const;
const mode = ref<(typeof FIVE_MODES)[number]["value"]>("compact");

// 把歪掉的變成灰階，突顯 UP 的
const emphasizeUp = ref(false);

const UP_STATUS_STYLE: Record<WishUpStatus, { border: string; dot: string }> = {
  won: { border: "border-green-500/60", dot: "bg-green-500/60" },
  lost: { border: "border-red-500/60", dot: "bg-red-500/60" },
  guaranteed: { border: "border-orange-400/60", dot: "bg-orange-400/60" },
};
const UP_STATUSES = Object.keys(UP_STATUS_STYLE) as WishUpStatus[];
const FADED_STYLE = { border: "border-gray-400/60", dot: "bg-gray-400/60" };
// 強調 UP 時，歪掉的改用灰色
const upStyle = (status: WishUpStatus, kind: "border" | "dot") =>
  status === "lost" && emphasizeUp.value ? FADED_STYLE[kind] : UP_STATUS_STYLE[status][kind];
</script>

<template>
  <div v-if="fives.length" class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <p>5 星紀錄（由新到舊）</p>
        <ul v-if="hasUp" class="flex flex-wrap gap-x-3" aria-label="外框顏色說明">
          <li v-for="status in UP_STATUSES" :key="status" class="flex items-center gap-1">
            <span
              class="size-2.5 rounded-full"
              :class="upStyle(status, 'dot')"
              aria-hidden="true"
            />{{ WISH_UP_LABEL[status] }}
          </li>
        </ul>
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <USwitch
          v-if="hasUp"
          v-model="emphasizeUp"
          size="xs"
          :label="`強調 UP ${weapon ? '武器' : '角色'}`"
        />
        <div class="flex gap-1" role="group" aria-label="顯示模式">
          <UButton
            v-for="option in FIVE_MODES"
            :key="option.value"
            :label="option.label"
            size="xs"
            :color="mode === option.value ? 'primary' : 'neutral'"
            :variant="mode === option.value ? 'soft' : 'ghost'"
            :aria-pressed="mode === option.value"
            @click="mode = option.value"
          />
        </div>
      </div>
    </div>
    <ul v-if="mode === 'compact'" class="flex flex-wrap gap-2 text-sm">
      <li
        v-for="five in fives.toReversed()"
        :key="five.id"
        class="rounded-md border-2 bg-accented px-2 py-1"
        :class="[
          five.up === undefined ? 'border-transparent' : upStyle(wishUpStatus(five)!, 'border'),
          { 'text-dimmed': emphasizeUp && five.up === false },
        ]"
        :title="five.time"
      >
        {{ items.get(five.itemId)?.name ?? `#${five.itemId}` }}
        <span
          class="font-semibold tabular-nums"
          :class="{ 'text-highlighted': !(emphasizeUp && five.up === false) }"
          >{{ five.pity }}</span
        >
        <span v-if="five.up !== undefined" class="sr-only">{{
          WISH_UP_LABEL[wishUpStatus(five)!]
        }}</span>
      </li>
    </ul>
    <ul
      v-else
      class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3"
    >
      <li v-for="five in fives.toReversed()" :key="five.id" :title="five.time">
        <ToolWishItemCard
          v-if="items.get(five.itemId)"
          :item="items.get(five.itemId)!"
          :pity="five.pity"
          :status="wishUpStatus(five)"
          :emphasize-up="emphasizeUp"
        />
        <p v-else class="rounded-lg bg-accented p-2 text-sm tabular-nums">
          #{{ five.itemId }}・{{ five.pity }}
        </p>
      </li>
    </ul>
  </div>

  <ToolWishVersionChart
    v-if="versions.length"
    :versions="versions"
    :items="items"
    :emphasize-up="emphasizeUp"
  />
</template>
