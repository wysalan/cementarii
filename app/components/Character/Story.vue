<script setup lang="ts">
import type { character } from "@/generated/prisma/client";
const { data } = defineProps<{ data: character }>();

import useDataParser from "@/composables/useDataParser";
const { parseStoryContent } = useDataParser();

import { useUserStore } from "@/stores/User";
const store = useUserStore();
</script>

<template>
  <div class="flex flex-col w-full h-[85vh] justify-start items-center mt-5 overflow-y-auto px-4">
    <div class="flex flex-col gap-5 w-full mb-24 md:mb-20">
      <UCollapsible
        v-for="(story, key) in data.profile?.story"
        :key="key"
        class="bg-parchment-100/90 backdrop-blur-sm rounded-lg shadow-md border border-gold-600/30 w-full"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between px-5 py-4 cursor-pointer group"
        >
          <span class="gi-diamond text-base md:text-lg font-semibold text-navy-800">{{
            story.title
          }}</span>
          <UIcon
            name="i-lucide-chevron-down"
            class="size-5 text-navy-600 transition-transform group-data-[state=open]:rotate-180"
          />
        </button>
        <template #content>
          <p
            class="text-sm md:text-base text-navy-700 px-5 pb-5"
            v-html="parseStoryContent(story.text, store.name, store.playerGender)"
          ></p>
        </template>
      </UCollapsible>
    </div>
  </div>
</template>

<style scoped></style>
