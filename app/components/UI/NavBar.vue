<script setup lang="ts">
import { siteLinks } from "@/site.config";
import { useUserStore } from "@/stores/User";
const store = useUserStore();

const dialogVisible = ref(false);
const newUserName = ref(store.name);
const newGender = ref(store.playerGender);
const newLevel = ref(store.defaultTalentLevel);

const levelOptions = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const reloadAfterSetting = ref(false);

const reloadPage = () => {
  if (reloadAfterSetting.value) {
    window.location.reload();
  }
};
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
              <span class="px-3 text-sm lg:text-base dark:text-black">{{ link.name }}</span>
            </NuxtLink>
            <a class="min-w-fit cursor-pointer" @click="dialogVisible = !dialogVisible"
              ><span class="px-3 text-sm lg:text-base dark:text-black">設定</span></a
            >
          </div>
        </div>
      </nav>
    </div>
  </header>

  <Dialog v-model:visible="dialogVisible" modal header="設定" :style="{ width: '25rem' }">
    <div class="flex flex-col mb-5 gap-5">
      <div class="flex flex-col gap-2 justify-center items-center">
        <p class="text-surface-500 dark:text-surface-400">
          玩家名稱
          <i
            class="pi pi-question-circle"
            v-tooltip.top="{
              value: '用於首頁顯示及旅行者角色故事的玩家顯示名稱',
              pt: { text: 'text-center' },
            }"
          ></i>
        </p>
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
          性別
          <i
            class="pi pi-question-circle"
            v-tooltip.top="{
              value: '此設定僅用於顯示角色故事中的第二人稱代詞',
              pt: { text: 'text-center' },
            }"
          ></i>
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
      <Divider
        align="center"
        :pt="{ root: { class: 'm-0' }, content: { class: 'bg-transparent select-none' } }"
      >
        <strong>以下設定需重新整理才可生效</strong>
      </Divider>
      <div class="flex flex-col gap-2 justify-center items-center">
        <p class="text-surface-500 dark:text-surface-400">技能預設顯示等級</p>
        <Select
          v-model="newLevel"
          :options="levelOptions"
          placeholder="Select a City"
          class="w-full md:w-56"
        />
      </div>
      <div class="flex justify-center items-center gap-2">
        <Checkbox
          v-model="reloadAfterSetting"
          inputId="reloadAfterSetting"
          name="reloadAfterSetting"
          binary
        />
        <label for="reloadAfterSetting">儲存後重新整理頁面</label>
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
          newLevel && store.changeDefaultTalentLevel(newLevel);
          reloadPage();
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
