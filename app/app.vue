<script setup lang="ts"></script>

<template>
  <UApp :tooltip="{ delayDuration: 200 }">
    <NuxtLayout>
      <LoadingIndicator />
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<style></style>
