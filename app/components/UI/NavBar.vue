<script setup lang="ts">
import { siteLinks } from "@/site.config";
import { useUserStore } from "@/stores/User";
const store = useUserStore();

const dialogVisible = ref(false);
const newUserName = ref(store.name);
const newGender = ref(store.playerGender);
const newLevel = ref(store.defaultTalentLevel);

const genderOptions = [
  { label: "男", value: "male" },
  { label: "女", value: "female" },
];
const levelOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const reloadAfterSetting = ref(false);

function saveSettings() {
  if (!newUserName.value) return;
  store.changeUserName(newUserName.value);
  if (newGender.value) store.changeGender(newGender.value);
  if (newLevel.value) store.changeDefaultTalentLevel(newLevel.value);
  dialogVisible.value = false;
  if (reloadAfterSetting.value) {
    window.location.reload();
  }
}
</script>

<template>
  <header
    class="sticky top-0 z-50 border-b border-gold-500/40 bg-navy-900/90 backdrop-blur-md shadow-md"
  >
    <div class="container mx-auto flex items-center gap-2 px-4 sm:px-6 h-14">
      <NuxtLink to="/" class="hidden md:block shrink-0 mr-2">
        <img
          src="@/assets/favicon.svg"
          width="36"
          height="36"
          class="block"
          alt="Cementarii's Logo"
        />
      </NuxtLink>
      <nav class="flex-1 min-w-0 overflow-x-auto">
        <ul class="flex items-center gap-1 md:justify-center">
          <li v-for="link in siteLinks" :key="link.path">
            <NuxtLink
              :to="{ name: link.path }"
              class="nav-link block px-3 py-1.5 rounded-full text-sm lg:text-base whitespace-nowrap transition-colors"
            >
              {{ link.name }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
      <div class="flex items-center gap-1 shrink-0">
        <UColorModeButton
          variant="ghost"
          class="text-parchment-200 hover:text-gold-300 hover:bg-gold-400/10"
          aria-label="切換深淺色模式"
        />
        <UButton
          icon="i-lucide-settings"
          variant="ghost"
          class="text-parchment-200 hover:text-gold-300 hover:bg-gold-400/10"
          aria-label="設定"
          @click="dialogVisible = true"
        />
      </div>
    </div>
  </header>

  <UModal v-model:open="dialogVisible" title="設定" :ui="{ content: 'max-w-sm' }">
    <template #body>
      <div class="flex flex-col gap-5">
        <UFormField label="玩家名稱" help="用於首頁顯示及旅行者角色故事的玩家顯示名稱" required>
          <UInput v-model="newUserName" autocomplete="off" class="w-full" />
        </UFormField>
        <UFormField label="性別" help="此設定僅用於顯示角色故事中的第二人稱代詞">
          <URadioGroup v-model="newGender" :items="genderOptions" orientation="horizontal" />
        </UFormField>
        <USeparator label="以下設定需重新整理才可生效" />
        <UFormField label="技能預設顯示等級">
          <USelect v-model="newLevel" :items="levelOptions" class="w-full" />
        </UFormField>
        <UCheckbox v-model="reloadAfterSetting" label="儲存後重新整理頁面" />
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="取消" variant="ghost" @click="dialogVisible = false" />
        <UButton
          label="儲存"
          color="primary"
          variant="solid"
          :disabled="!newUserName"
          @click="saveSettings"
        />
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.nav-link {
  color: color-mix(in srgb, var(--color-parchment-200) 85%, transparent);
}
.nav-link:hover {
  color: var(--color-gold-300);
}
.nav-link.router-link-active {
  color: var(--color-gold-300);
  background-color: color-mix(in srgb, var(--color-gold-400) 15%, transparent);
}
</style>
