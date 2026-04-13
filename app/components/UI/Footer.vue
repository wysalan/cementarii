<script setup lang="ts">
const today = new Date();
</script>

<template>
  <footer class="container mx-auto px-8 sm:px-10 2xl:px-12 border-t-2 border-t-black/30">
    <div class="flex flex-col items-center justify-between py-2 text-center">
      <p>&copy; {{ today.getFullYear() }} Cementarii</p>
      <div class="mt-2 text-sm select-none">
        <p class="text-center opacity-90">
          Cementarii 為個人專案，與米哈遊或 HoYoverse 無任何關聯。
        </p>
        <p class="text-center opacity-90">
          此網站所引用之《原神》遊戲素材，為米哈遊 moHoYo 及 HoYoverse 版權所有。
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped></style>
