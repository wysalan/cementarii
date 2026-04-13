<script setup lang="ts">
import { siteLinks } from "@/site.config";
</script>

<template>
  <header class="container mx-auto px-8 sm:px-10 2xl:px-12 py-3 sticky top-0 left-0 z-50">
    <div class="flex items-center justify-center gap-5">
      <a href="/" class="hidden md:inline-block">
        <img
          src="@/assets/favicon.svg"
          width="40"
          height="40"
          class="block"
          alt="Cementarii's Logo"
        />
      </a>
      <nav>
        <div
          class="flex items-center justify-between bg-zinc-200/70 rounded-xl px-9 h-11 backdrop-blur-md w-90vw md:w-full overflow-x-auto"
        >
          <div class="flex flex-row items-center md:justify-center gap-8 text-lg">
            <NuxtLink
              v-for="link in siteLinks"
              :to="{ name: link.path }"
              active-class="link-active"
              class="min-w-fit"
            >
              <span class="px-3 text-sm lg:text-base">{{ link.name }}</span>
            </NuxtLink>
          </div>
        </div>
      </nav>
    </div>
  </header>
</template>

<style scope>
a.link-active {
  @apply bg-white rounded-md shadow-sm;
}
</style>
