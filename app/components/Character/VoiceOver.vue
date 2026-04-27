<script setup lang="ts">
import type { character } from "@/generated/prisma/client";
const { data } = defineProps<{ data: character }>();

import useDataParser from "@/composables/useDataParser";
const { parseStoryContent } = useDataParser();

import { useUserStore } from "@/stores/User";
const store = useUserStore();
</script>

<template>
  <div class="flex flex-col w-full h-85vh justify-start items-center mt-5 overflow-y-auto">
    <div class="flex flex-col gap-5 mb-20 md:mb-15">
      <Card
        v-for="(voiceover, key) in data.profile?.voiceover"
        :key="key"
        :pt="{ root: { class: 'bg-white/80! backdrop-blur-sm shadow-md' } }"
        class="w-full"
      >
        <template #title>
          <h2 class="text-2xl py-2 dark:text-zinc-700!">{{ voiceover.title }}</h2>
        </template>
        <template #content>
          <p
            class="text-lg dark:text-zinc-700!"
            v-html="parseStoryContent(voiceover.text, store.name, store.playerGender)"
          ></p>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped></style>
