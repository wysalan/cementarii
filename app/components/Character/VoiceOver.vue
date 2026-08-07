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
      <section
        v-for="(voiceover, key) in data.profile?.voiceover"
        :key="key"
        class="bg-parchment-100/90 backdrop-blur-sm rounded-lg shadow-md border border-gold-600/30 p-5 w-full"
      >
        <h2 class="gi-diamond text-base md:text-lg font-semibold text-navy-800 pb-3">
          {{ voiceover.title }}
        </h2>
        <p
          class="text-sm md:text-base text-navy-700"
          v-html="parseStoryContent(voiceover.text, store.name, store.playerGender)"
        ></p>
      </section>
    </div>
  </div>
</template>

<style scoped></style>
