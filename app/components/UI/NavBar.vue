<script setup lang="ts">
import { siteLinks } from "@/site.config";
import { useUserStore } from "@/stores/User";
const store = useUserStore();

const dialogVisible = ref(false);
const newUserName = ref(store.name);
const newGender = ref(store.playerGender);
</script>

<template>
  <header class="container mx-auto px-8 sm:px-10 2xl:px-12 py-3 sticky top-0 left-0 z-50">
    <div class="flex items-center justify-center gap-5">
      <a href="/" class="hidden md:inline-block">
        <img
          src="@/assets/favicon.svg"
          width="40"
          height="40"
          class="block"
          alt="Cementarii's Logo"
        />
      </a>
      <nav>
        <div
          class="flex items-center justify-between bg-zinc-200/70 rounded-xl px-9 h-11 backdrop-blur-md w-90vw md:w-full overflow-x-auto"
        >
          <div class="flex flex-row items-center md:justify-center gap-8 text-lg">
            <NuxtLink
              v-for="link in siteLinks"
              :to="{ name: link.path }"
              active-class="link-active"
              class="min-w-fit"
            >
              <span class="px-3 text-sm lg:text-base">{{ link.name }}</span>
            </NuxtLink>
            <a class="min-w-fit cursor-pointer" @click="dialogVisible = !dialogVisible"
              ><span class="px-3 text-sm lg:text-base">設定</span></a
            >
          </div>
        </div>
      </nav>
    </div>
  </header>

  <Dialog v-model:visible="dialogVisible" modal header="設定" :style="{ width: '25rem' }">
    <div class="flex flex-col mb-5 gap-5">
      <div class="flex flex-col gap-2 justify-center items-center">
        <p class="text-surface-500 dark:text-surface-400">使用者名稱</p>
        <InputText
          id="username"
          class="flex-auto"
          autocomplete="off"
          v-model="newUserName"
          :invalid="!newUserName"
        />
      </div>
      <div class="flex flex-col gap-2 justify-center items-center">
        <p class="text-surface-500 dark:text-surface-400">
          性別（<i
            class="pi pi-question"
            v-tooltip.top="{
              value: '此設定僅用於顯示角色故事中的第二人稱代詞',
              pt: { text: 'text-center' },
            }"
          ></i
          >）
        </p>
        <div class="flex flex-wrap gap-4">
          <div class="flex items-center gap-2">
            <RadioButton v-model="newGender" inputId="gender-male" name="male" value="male" />
            <label for="gender-male">男</label>
          </div>
          <div class="flex items-center gap-2">
            <RadioButton v-model="newGender" inputId="gender-female" name="female" value="female" />
            <label for="gender-female">女</label>
          </div>
        </div>
      </div>
    </div>
    <div class="flex justify-end gap-2">
      <Button
        type="button"
        label="取消"
        severity="secondary"
        @click="dialogVisible = false"
      ></Button>
      <Button
        type="button"
        label="儲存"
        @click="
          newUserName && (dialogVisible = false);
          newUserName && store.changeUserName(newUserName);
          newGender && store.changeGender(newGender);
        "
      ></Button>
    </div>
  </Dialog>
</template>

<style scope>
a.link-active {
  @apply bg-white rounded-md shadow-sm;
}
</style>
