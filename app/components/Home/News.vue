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

const { data } = await useFetch<NewsData>("https://gi.yatta.moe/assets/data/event.json");

const newsList = computed(() => {
  if (data.value) {
    return Object.values(data.value);
  }
});

const dialogVisible = ref(false);

const eventDetail = ref();

function setEventDetail(eventData: EventData) {
  eventDetail.value = eventData;
}
</script>

<template>
  <div>
    <h2 class="text-2xl pb-2">所有活動一覽</h2>
    <div class="flex flex-col gap-2 bg-zinc-200 rounded-md p-5 h-150">
      <div v-if="data && newsList" class="overflow-y-auto">
        <div v-for="(value, key) in newsList" class="p-2 mb-2 bg-zinc-300 rounded-sm">
          <span
            class="cursor-pointer"
            @click="
              dialogVisible = true;
              setEventDetail(value);
            "
            >{{ value["nameFull"]["CHT"] }}</span
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
    :data="eventDetail"
    modal
    :header="eventDetail?.nameFull['CHT']"
    class="w-75vw lg:w-50vw"
  >
    <div class="flex flex-col gap-5">
      <NuxtImg :src="eventDetail?.banner['CHT']" class="w-full rounded-sm" />
      <div class="flex flex-col gap-1" v-html="eventDetail?.description['CHT']"></div>
    </div>
  </Dialog>
</template>

<style scoped></style>
