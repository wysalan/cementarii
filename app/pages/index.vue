<script setup lang="ts"></script>

<template>
  <main class="container mx-auto py-5">
    <div class="grid grid-cols-1 lg:grid-cols-[repeat(2,1fr)] gap-5 max-lg:mx-5">
      <div class="flex flex-col gap-5">
        <HomeWelcome />
        <HomeNews />
      </div>
      <div class="flex flex-col gap-5">
        <HomeQuickResinCal />
      </div>
    </div>
  </main>
</template>

<style scoped></style>
