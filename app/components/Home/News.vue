<script setup lang="ts">
interface EventData {
  id: number;
  name: Record<string, string>;
  nameFull: Record<string, string>;
  description: Record<string, string>;
  banner: Record<string, string>;
  startAt: string;
  endAt: string;
}

interface GroupedEventData {
  id: number | undefined;
  name: string | undefined;
  description: string | undefined;
  banner: string | undefined;
  start: string | undefined;
  end: string | undefined;
  type: string | undefined;
}

const { data, status } = await useAsyncData(
  "events",
  () => $fetch<EventData[]>("https://gi.yatta.moe/assets/data/event.json"),
  {
    transform: (res) => {
      const eventList: EventData[] = Object.values(res || {});
      if (eventList) {
        const result: GroupedEventData[] = [];
        eventList.map((event) => {
          result.push({
            id: event.id,
            name: event.nameFull["CHT"],
            description: event.description["CHT"],
            banner: event.banner["CHT"],
            start: event.startAt,
            end: event.endAt,
            type: getEventType(event.nameFull["CHT"]),
          });
        });
        return result;
      }
    },
  },
);

function getEventType(name: string | undefined) {
  if (name) {
    if (name.includes("活動")) {
      return "活動";
    } else if (name.includes("任務")) {
      return "任務";
    } else if (name.includes("祈願")) {
      return "祈願";
    } else {
      return "其他";
    }
  }
}

const eventFilter = ref("活動");
const dialogVisible = ref(false);
const eventDetail = ref();

const filteredEventList = computed(() => {
  return data.value?.filter((event) => event.type === eventFilter.value);
});

function setEventDetail(eventData: GroupedEventData) {
  eventDetail.value = eventData;
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-5 gi-panel p-5 h-fit">
      <h2 class="text-2xl text-highlighted">活動一覽</h2>
      <div class="flex flex-row flex-wrap gap-2">
        <UButton
          v-for="type in ['活動', '任務', '祈願', '其他']"
          :key="type"
          :label="type"
          :color="eventFilter === type ? 'primary' : 'neutral'"
          :variant="eventFilter === type ? 'solid' : 'soft'"
          class="min-w-fit rounded-full"
          @click="eventFilter = type"
        />
      </div>
      <div v-if="status === 'pending'" class="max-h-50 overflow-y-auto">
        <USkeleton class="w-full h-50" />
      </div>
      <div v-else class="max-h-50 overflow-y-auto">
        <button
          v-for="(event, key) in filteredEventList"
          type="button"
          class="block w-full text-left p-2 mb-2 bg-parchment-200 dark:bg-navy-950 rounded-sm cursor-pointer hover:ring-1 ring-inset ring-gold-500 transition-shadow"
          :key="key"
          @click="
            dialogVisible = true;
            setEventDetail(event);
          "
        >
          {{ event.name }}
        </button>
      </div>
    </div>
  </div>

  <UModal
    v-model:open="dialogVisible"
    :title="eventDetail?.name"
    :ui="{ content: 'max-w-[95vw] lg:max-w-[50vw]' }"
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <NuxtImg :src="eventDetail?.banner" class="w-full rounded-sm" />
        <div class="event-content flex flex-col gap-1" v-html="eventDetail?.description"></div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.event-content :deep(table) {
  min-width: 100%;
  border: 2px solid var(--ui-border-accented);
  text-align: center;
}
.event-content :deep(table tbody tr),
.event-content :deep(table tbody td) {
  border: 2px solid var(--ui-border-accented);
}
</style>
