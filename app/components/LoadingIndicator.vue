<script setup lang="ts">
const { progress, isLoading } = useLoadingIndicator();
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isLoading"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-400/90 dark:bg-zinc-700/70 backdrop-blur-sm"
    >
      <img
        src="@/assets/LoadingProgressBar.webp"
        class="w-80vw md:w-60vw xl:w-35vw h-auto transition-[clip-path] select-none"
        :style="{ clipPath: `inset(0 ${100 - progress}% 0 0)` }"
      />
    </div>
  </Transition>
</template>

<style scoped>
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-leave-to {
  opacity: 0;
}
</style>
