<script setup lang="ts">
import { useRoute } from "vue-router";
const { slug } = useRoute().params;
const route = useRoute();
</script>

<template>
  <main class="container mx-auto pt-5 pb-10">
    <div>
      <p>This is {{ slug }}'s detail page.</p>
      <p>path: {{ route.path }}</p>
      <p>param: {{ route.params }}</p>
    </div>
  </main>
</template>

<style scoped></style>
