<script setup lang="ts">
import { siteConfig } from "@/site.config";

useSeoMeta({
  title: `祈願紀錄 | ${siteConfig.title}`,
});

const BASE = "/tool/wish-history";

const { stored, loaded, load, pending, importing, canImport, previewImport, confirmImport } =
  useWishData();

onMounted(load);

const route = useRoute();

const accountLinks = computed(() =>
  stored.value.map(({ account, records }) => ({
    uid: account.uid,
    pools: WISH_POOLS.map((pool) => ({
      label: pool.name,
      to: `${BASE}/${account.uid}/${pool.slug}`,
      empty: !records.some((r) => wishPoolOf(r.gachaType) === pool.key),
    })),
  })),
);

const mainLinks = [{ label: "總覽", to: BASE, icon: "i-lucide-layout-dashboard" }];
const importLinks = [
  { label: "從檔案匯入", to: `${BASE}/import-file`, icon: "i-lucide-upload" },
  { label: "從遊戲匯入", to: `${BASE}/import-game`, icon: "i-lucide-cloud-download" },
];

// 窄螢幕改用下拉選單
const currentPath = computed({
  get: () => route.path.replace(/\/$/, ""),
  set: (path) => void navigateTo(path),
});

const pendingOpen = computed({
  get: () => !!pending.value,
  set: (value) => {
    if (!value) pending.value = null;
  },
});

const linkClass =
  "flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-accented transition-colors";
const activeClass = "bg-accented font-semibold text-highlighted";
</script>

<template>
  <main class="container mx-auto pt-5 pb-10 px-4">
    <h2 class="gi-diamond text-center text-2xl font-semibold text-highlighted mb-5">祈願紀錄</h2>
    <div class="flex flex-col md:flex-row md:items-start gap-5">
      <select
        v-model="currentPath"
        aria-label="切換頁面"
        class="md:hidden w-full gi-panel px-3 py-2 bg-elevated text-default"
      >
        <option v-for="link in [...mainLinks, ...importLinks]" :key="link.to" :value="link.to">
          {{ link.label }}
        </option>
        <optgroup v-for="account in accountLinks" :key="account.uid" :label="`UID ${account.uid}`">
          <option v-for="pool in account.pools" :key="pool.to" :value="pool.to">
            {{ pool.label }}
          </option>
        </optgroup>
      </select>
      <!-- 寬度不到 xl 時 header 會蓋到側邊欄，改成停在 header 下方 -->
      <nav
        class="hidden md:flex flex-col gap-1 gi-panel p-3 w-56 shrink-0 sticky top-17 max-h-[calc(100dvh-5rem)] xl:top-3 xl:max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
        aria-label="祈願紀錄"
      >
        <NuxtLink
          v-for="link in mainLinks"
          :key="link.to"
          :to="link.to"
          :class="linkClass"
          :exact-active-class="activeClass"
        >
          <UIcon :name="link.icon" class="size-4" />{{ link.label }}
        </NuxtLink>
        <USeparator class="my-1" />
        <NuxtLink
          v-for="link in importLinks"
          :key="link.to"
          :to="link.to"
          :class="linkClass"
          :exact-active-class="activeClass"
        >
          <UIcon :name="link.icon" class="size-4" />{{ link.label }}
        </NuxtLink>
        <div v-if="!loaded" class="flex flex-col gap-2 px-3" aria-busy="true" aria-label="載入中">
          <USeparator class="my-1" />
          <USkeleton v-for="n in 6" :key="n" class="h-6 bg-accented" :class="n === 1 && 'w-2/3'" />
        </div>
        <ClientOnly>
          <template v-for="account in accountLinks" :key="account.uid">
            <USeparator class="my-1" />
            <p class="px-3 py-1 text-sm text-muted">UID {{ account.uid }}</p>
            <NuxtLink
              v-for="pool in account.pools"
              :key="pool.to"
              :to="pool.to"
              :class="[linkClass, pool.empty && 'text-dimmed']"
              :exact-active-class="activeClass"
            >
              {{ pool.label }}
            </NuxtLink>
          </template>
        </ClientOnly>
      </nav>

      <div class="flex-1 min-w-0 flex flex-col gap-5">
        <NuxtPage />
      </div>
    </div>

    <UModal
      v-model:open="pendingOpen"
      :title="`確認匯入（${pending?.source}）`"
      :dismissible="!importing"
      :ui="{ content: 'max-w-md' }"
    >
      <template #body>
        <div v-if="pending" class="flex flex-col gap-4">
          <div
            v-for="(account, index) in pending.accounts"
            :key="index"
            class="flex flex-col gap-2"
          >
            <UCheckbox
              v-if="pending.accounts.length > 1"
              v-model="account.selected"
              :disabled="!account.records.length"
              :label="account.uid ? `UID ${account.uid}` : (account.label ?? '未知帳號')"
              :ui="{ label: 'font-semibold text-highlighted' }"
            />
            <p v-else-if="account.uid" class="font-semibold text-highlighted">
              UID {{ account.uid }}
            </p>
            <UFormField
              v-if="!account.uid && account.selected"
              label="UID"
              help="這份紀錄沒有記錄 UID，請輸入這些紀錄所屬帳號的 UID"
            >
              <UInput
                v-model="account.uidInput"
                inputmode="numeric"
                autocomplete="off"
                class="w-48"
              />
            </UFormField>
            <table v-if="account.selected" class="w-full text-sm">
              <thead>
                <tr class="text-left text-muted">
                  <th class="py-1 pr-3 font-normal">卡池</th>
                  <th class="py-1 pr-3 font-normal text-right">新增</th>
                  <th class="py-1 font-normal text-right">已存在</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="pool in previewImport(account)"
                  :key="pool.key"
                  class="border-t border-default"
                >
                  <td class="py-1 pr-3">{{ pool.name }}</td>
                  <td class="py-1 pr-3 text-right tabular-nums">{{ pool.added }}</td>
                  <td class="py-1 text-right tabular-nums">{{ pool.duplicated }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="account.skipped && account.selected" class="text-sm text-muted">
              另有 {{ account.skipped }} 筆無法辨識，將會略過。
            </p>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            label="取消"
            variant="ghost"
            color="neutral"
            :disabled="importing"
            @click="pending = null"
          />
          <UButton
            label="確認匯入"
            color="primary"
            :disabled="!canImport"
            :loading="importing"
            @click="confirmImport"
          />
        </div>
      </template>
    </UModal>
  </main>
</template>

<style scoped></style>
