<script setup lang="ts">
const today = new Date();
</script>

<template>
  <footer class="container mx-auto border-t-2 border-t-black/30">
    <div class="flex flex-col md:flex-row items-center justify-between py-2 text-center">
      <p>&copy; {{ today.getFullYear() }} Cementarii</p>
      <div class="mt-2 text-sm md:text-right select-none opacity-80">
        <p>Cementarii 為個人專案，與米哈遊或 HoYoverse 無任何關聯。</p>
        <p>此網站所引用之《原神》遊戲素材，為米哈遊及 HoYoverse 版權所有。</p>
      </div>
    </div>
  </footer>
</template>

<style scoped></style>
