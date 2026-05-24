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
    <h2 class="text-2xl pb-2">活動一覽</h2>
    <div class="flex flex-col gap-5 bg-zinc-200 dark:bg-zinc-700 rounded-md p-5 h-fit">
      <div class="flex flex-row gap-3">
        <Button
          label="活動"
          @click="eventFilter = '活動'"
          :severity="eventFilter === '活動' ? 'contrast' : 'secondary'"
          class="min-w-fit"
        />
        <Button
          label="任務"
          @click="eventFilter = '任務'"
          :severity="eventFilter === '任務' ? 'contrast' : 'secondary'"
          class="min-w-fit"
        />
        <Button
          label="祈願"
          @click="eventFilter = '祈願'"
          :severity="eventFilter === '祈願' ? 'contrast' : 'secondary'"
          class="min-w-fit"
        />
        <Button
          label="其他"
          @click="eventFilter = '其他'"
          :severity="eventFilter === '其他' ? 'contrast' : 'secondary'"
          class="min-w-fit"
        />
      </div>
      <div v-if="status === 'pending'" class="max-h-50 overflow-y-auto">
        <Skeleton width="100%" height="12.5rem"></Skeleton>
      </div>
      <div v-else class="max-h-50 overflow-y-auto">
        <div
          v-for="(event, key) in filteredEventList"
          class="p-2 mb-2 bg-zinc-300 dark:bg-zinc-950 rounded-sm dark:text-white"
          :key="key"
        >
          <span
            class="cursor-pointer"
            @click="
              dialogVisible = true;
              setEventDetail(event);
            "
            >{{ event.name }}</span
          >
        </div>
      </div>
    </div>
  </div>

  <Dialog
    v-model:visible="dialogVisible"
    modal
    :header="eventDetail?.name"
    :pt="{
      root: { class: 'bg-white/90! dark:bg-zinc-700/80! backdrop-blur-md' },
      header: { class: 'text-zinc-700! dark:text-white!' },
    }"
    class="w-95vw lg:w-50vw"
  >
    <div class="flex flex-col gap-5">
      <NuxtImg :src="eventDetail?.banner" class="w-full rounded-sm" />
      <div
        class="event-content flex flex-col gap-1 text-zinc-700! dark:text-white!"
        v-html="eventDetail?.description"
      ></div>
    </div>
  </Dialog>
</template>

<style scoped>
.event-content :deep(table) {
  @apply min-w-full border-2 border-zinc-600 text-center;
  tbody tr,
  tbody td {
    @apply border-2 border-zinc-600;
  }
}
</style>
