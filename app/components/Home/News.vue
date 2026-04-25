<script setup lang="ts">
interface NewsData {
  [key: string]: {
    id: number;
    name: Record<string, string>;
    nameFull: Record<string, string>;
    description: Record<string, string>;
    banner: Record<string, string>;
    startAt: string;
    endAt: string;
  };
}

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

const { data } = await useFetch<NewsData>("https://gi.yatta.moe/assets/data/event.json");

const eventList: EventData[] = Object.values(data.value || {});

function getEventType(name: string | undefined) {
  if (name) {
    if (name.includes("活動") || name.includes("任務")) {
      return "活動";
    } else if (name.includes("祈願")) {
      return "祈願";
    } else {
      return "其他";
    }
  }
}

const groupedEventList = computed(() => {
  const result: GroupedEventData[] = [];
  if (eventList) {
    eventList.map((news: EventData) => {
      result.push({
        id: news.id,
        name: news.nameFull["CHT"],
        description: news.description["CHT"],
        banner: news.banner["CHT"],
        start: news.startAt,
        end: news.endAt,
        type: getEventType(news.nameFull["CHT"]),
      });
    });
  }
  return result.sort((a, b) => Date.parse(b.start!) - Date.parse(a.start!));
});

const eventFilter = ref("全部");

const filteredEventList = computed(() => {
  if (eventFilter.value === "全部") {
    return groupedEventList.value;
  }
  return groupedEventList.value.filter((event) => event.type === eventFilter.value);
});

function switchEventType(type: string) {
  eventFilter.value = type;
}

const dialogVisible = ref(false);

const eventDetail = ref();

function setEventDetail(eventData: GroupedEventData) {
  eventDetail.value = eventData;
}
</script>

<template>
  <div>
    <h2 class="text-2xl pb-2">所有活動一覽</h2>
    <div class="flex flex-col gap-5 bg-zinc-200 rounded-md p-5 h-fit">
      <div class="flex flex-row gap-3">
        <Button
          label="全部"
          @click="switchEventType('全部')"
          :severity="eventFilter === '全部' ? 'contrast' : 'secondary'"
          class="min-w-fit"
        />
        <Button
          label="活動"
          @click="switchEventType('活動')"
          :severity="eventFilter === '活動' ? 'contrast' : 'secondary'"
          class="min-w-fit"
        />
        <Button
          label="祈願"
          @click="switchEventType('祈願')"
          :severity="eventFilter === '祈願' ? 'contrast' : 'secondary'"
          class="min-w-fit"
        />
        <Button
          label="其他"
          @click="switchEventType('其他')"
          :severity="eventFilter === '其他' ? 'contrast' : 'secondary'"
          class="min-w-fit"
        />
      </div>
      <div v-if="data" class="h-100 overflow-y-auto">
        <div
          v-for="(event, key) in filteredEventList"
          class="p-2 mb-2 bg-zinc-300 rounded-sm dark:text-black"
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
      <div v-else>
        <p>載入中</p>
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
        class="flex flex-col gap-1 text-zinc-700! dark:text-white!"
        v-html="eventDetail?.description"
      ></div>
    </div>
  </Dialog>
</template>

<style scoped></style>
