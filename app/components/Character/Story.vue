<script setup lang="ts">
import type { character } from "@/generated/prisma/client";
const { data } = defineProps<{ data: character }>();

import useDataParser from "@/composables/useDataParser";
const { parseDescriptionText, parseStoryContent } = useDataParser();

import { useUserStore } from "@/stores/User";
const store = useUserStore();
</script>

<template>
  <div class="flex flex-col w-full h-85vh justify-start items-center mt-5 overflow-y-auto">
    <div class="flex flex-col gap-5 w-full mb-20 md:mb-15">
      <Panel
        :header="story.title"
        toggleable
        collapsed
        class="rounded-xl"
        v-for="(story, key) in data.profile?.story"
        :pt="{
          root: { class: 'w-full bg-white/80! backdrop-blur-sm py-2 shadow-md' },
          header: { class: 'text-xl dark:text-zinc-700!' },
        }"
      >
        <p
          class="text-lg dark:text-zinc-700!"
          v-html="
            parseStoryContent(parseDescriptionText(story.text), store.name, store.playerGender)
          "
        ></p>
      </Panel>
    </div>
  </div>
</template>

<style scoped></style>
