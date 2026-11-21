<script setup lang="ts">
import { useUserStore } from "@/stores/User";

const open = defineModel<boolean>("open", { required: true });
const store = useUserStore();

const empty = () => ({ ltuid: "", ltoken: "", ltmid: "", uid: "" });
const form = ref(empty());

watch(open, (value) => {
  if (value) form.value = { ...empty(), ...store.hoyolab };
});

// 貼上整串 cookie（ltoken_v2=...; ltuid_v2=...）時，自動拆到各欄位
function onPaste(event: ClipboardEvent) {
  const parsed = parseHoyolabCookie(event.clipboardData?.getData("text") ?? "");
  if (!Object.keys(parsed).length) return;
  event.preventDefault();
  Object.assign(form.value, parsed);
}

const valid = computed(
  () =>
    /^\d+$/.test(form.value.ltuid.trim()) &&
    !!form.value.ltoken.trim() &&
    !!form.value.ltmid.trim() &&
    /^([6-9]|18)\d{8}$/.test(form.value.uid.trim()),
);

function save() {
  const { ltuid, ltoken, ltmid, uid } = form.value;
  store.setHoyolab({
    ltuid: ltuid.trim(),
    ltoken: ltoken.trim(),
    ltmid: ltmid.trim(),
    uid: uid.trim(),
  });
  open.value = false;
}

function remove() {
  store.setHoyolab(null);
  open.value = false;
}
</script>

<template>
  <UModal v-model:open="open" title="HoYoLAB 連動設定" :ui="{ content: 'max-w-md' }">
    <template #body>
      <div class="flex flex-col gap-4 text-sm">
        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-shield-alert"
          title="使用前請先了解"
          :ui="{ title: 'text-highlighted', description: 'text-default opacity-100' }"
        >
          <template #description>
            <ul class="list-disc pl-4 space-y-1">
              <li>這是非官方的串接方式，風險請自行評估。</li>
              <li>Cookie 等同 HoYoLAB 帳號的登入狀態，請勿提供給不信任的網站。</li>
              <li>
                資料只存在這個瀏覽器；查詢時才會經由本站伺服器轉送給 HoYoLAB，伺服器不會保留。
              </li>
              <li>
                詳細說明請見
                <NuxtLink to="/privacy-policy" target="_blank" class="underline"
                  >隱私權政策</NuxtLink
                >。
              </li>
            </ul>
          </template>
        </UAlert>
        <ol class="list-decimal pl-5 space-y-1">
          <li>在 HoYoLAB 的戰績設定開啟「即時便箋」。</li>
          <li>
            登入
            <a
              href="https://www.hoyolab.com"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
              >HoYoLAB</a
            >
            後按 F12，到「應用程式（Application）」→「Cookie」。
          </li>
          <li>複製下列三個 Cookie 的值貼到對應欄位。</li>
        </ol>
        <UFormField label="ltuid_v2">
          <UInput v-model="form.ltuid" autocomplete="off" class="w-full" @paste="onPaste" />
        </UFormField>
        <UFormField label="ltoken_v2">
          <UInput
            v-model="form.ltoken"
            type="password"
            autocomplete="off"
            class="w-full"
            @paste="onPaste"
          />
        </UFormField>
        <UFormField label="ltmid_v2">
          <UInput v-model="form.ltmid" autocomplete="off" class="w-full" @paste="onPaste" />
        </UFormField>
        <UFormField label="遊戲 UID" help="僅支援國際服（美、歐、亞、台港澳）">
          <UInput v-model="form.uid" inputmode="numeric" autocomplete="off" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-between gap-2">
        <UButton
          v-if="store.hoyolab"
          label="移除連動"
          color="error"
          variant="ghost"
          @click="remove"
        />
        <span v-else></span>
        <div class="flex gap-2">
          <UButton label="取消" variant="ghost" @click="open = false" />
          <UButton label="儲存" color="primary" :disabled="!valid" @click="save" />
        </div>
      </div>
    </template>
  </UModal>
</template>
