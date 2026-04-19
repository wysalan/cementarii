<script setup lang="ts">
import { useRoute } from "vue-router";

const { slug } = useRoute().params;
</script>

<template>
  <main class="container mx-auto pt-5 pb-10">
    <p>Here's {{ slug }}'s Detail page (Under Construction.)</p>
  </main>
</template>

<style scoped></style>
