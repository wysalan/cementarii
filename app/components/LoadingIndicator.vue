<script setup lang="ts">
const { progress, isLoading, start, finish, clear } = useLoadingIndicator({
  duration: 2000,
  throttle: 200,
  // This is how progress is calculated by default
  estimatedProgress: (duration, elapsed) =>
    (2 / Math.PI) * 100 * Math.atan(((elapsed / duration) * 100) / 50),
});
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isLoading"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-400/90 backdrop-blur-sm"
    >
      <img
        src="@/assets/LoadingProgressBar.webp"
        class="w-60vw xl:w-30vw h-auto transition-[clip-path] select-none"
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
