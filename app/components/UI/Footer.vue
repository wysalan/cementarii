<script setup lang="ts">
const today = new Date();
</script>

<template>
  <footer class="border-t border-gold-500/40 mt-8">
    <div
      class="container mx-auto flex flex-col md:flex-row items-center justify-between gap-2 px-4 sm:px-6 py-4 text-center"
    >
      <div class="flex flex-col items-center md:items-start gap-1">
        <p class="font-semibold text-highlighted">&copy; {{ today.getFullYear() }} Cementarii</p>
        <NuxtLink to="/privacy-policy" class="text-sm text-muted hover:text-highlighted">
          隱私權政策
        </NuxtLink>
      </div>
      <div class="text-sm md:text-right select-none text-muted">
        <p>Cementarii 為個人專案，與米哈遊或 HoYoverse 無任何關聯。</p>
        <p>此網站所引用之《原神》遊戲素材，為米哈遊及 HoYoverse 版權所有。</p>
      </div>
    </div>
  </footer>
</template>

<style scoped></style>
