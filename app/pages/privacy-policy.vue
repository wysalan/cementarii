<script setup lang="ts">
import { siteConfig } from "@/site.config";

useSeoMeta({
  title: `隱私權政策 | ${siteConfig.title}`,
});
</script>

<template>
  <main class="container mx-auto pt-5 pb-10 px-4">
    <article class="mx-auto max-w-3xl flex flex-col gap-5">
      <header class="flex flex-col items-center gap-2">
        <h1 class="text-2xl font-semibold text-highlighted">隱私權政策</h1>
        <p class="text-sm text-muted">最後更新：2026 年 11 月 21 日</p>
      </header>

      <section class="gi-panel p-5 flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-highlighted">概要</h2>
        <p>
          {{ siteConfig.title }}
          是個人經營的《原神》資料查詢與工具網站。本站沒有帳號系統，不需要註冊或登入，也不會要求你提供姓名、電子郵件等個人資料。
        </p>
        <p>
          你在本站所做的設定都只儲存在自己的瀏覽器裡。唯一會經過本站伺服器的個人資料，是你主動啟用「HoYoLAB
          連動」後，查詢樹脂時送出的連動資料，詳見下方說明。
        </p>
      </section>

      <section class="gi-panel p-5 flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-highlighted">儲存在瀏覽器的資料</h2>
        <p>以下資料儲存在你瀏覽器的 localStorage，不會傳送到本站伺服器：</p>
        <ul class="list-disc pl-5 space-y-1">
          <li>玩家名稱、性別等顯示用的設定</li>
          <li>天賦預設等級、角色頁面背景樣式、深淺色模式等介面偏好</li>
          <li>HoYoLAB 連動資料（有設定時才有）</li>
        </ul>
        <p>清除瀏覽器的網站資料，就會把上述內容全部刪除。</p>
      </section>

      <section class="gi-panel p-5 flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-highlighted">HoYoLAB 連動</h2>
        <p>這是選用功能，沒有設定就不會有任何資料送往 HoYoLAB。啟用後的處理方式如下：</p>
        <ul class="list-disc pl-5 space-y-1">
          <li>
            你提供的 HoYoLAB Cookie（ltuid_v2、ltoken_v2、ltmid_v2）與遊戲 UID 只儲存在你的瀏覽器。
          </li>
          <li>
            只有在你按下「從 HoYoLAB 取得」時，這些資料才會送到本站伺服器，由伺服器代為向 HoYoLAB
            查詢即時便箋中的樹脂資訊。
          </li>
          <li>伺服器只在該次查詢中使用這些資料，不會儲存，也不會寫入紀錄。</li>
          <li>本站只取用樹脂數量與回復時間，不會讀取或變更你 HoYoLAB 帳號的其他內容。</li>
        </ul>
        <p>
          這是非官方的串接方式，Cookie 等同你 HoYoLAB
          帳號的登入狀態，請自行評估風險後再使用。你可以隨時在樹脂計算器的「連動設定」中選擇「移除連動」；若想讓已提供的
          Cookie 失效，請到 HoYoLAB 登出或變更密碼。
        </p>
      </section>

      <section class="gi-panel p-5 flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-highlighted">伺服器紀錄</h2>
        <p>
          本站部署在 Cloudflare。和大多數網站一樣，Cloudflare
          會在你瀏覽時記錄連線的基本資訊，例如時間、請求的網址、IP
          位址與瀏覽器類型，用於維持服務運作、偵錯與防止濫用。本站不會用這些資訊辨識個別使用者。
        </p>
      </section>

      <section class="gi-panel p-5 flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-highlighted">第三方服務</h2>
        <p>
          瀏覽本站時，你的瀏覽器或本站伺服器會向下列服務取得資料，這些服務各有自己的隱私權政策：
        </p>
        <ul class="list-disc pl-5 space-y-1">
          <li>Cloudflare：網站主機、圖片與影片的存放</li>
          <li>ennead.cc：首頁的兌換碼清單（由你的瀏覽器直接取得）</li>
          <li>Yatta（gi.yatta.moe）：首頁的活動資訊</li>
          <li>HoYoLAB：啟用連動後的樹脂查詢</li>
        </ul>
      </section>

      <section class="gi-panel p-5 flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-highlighted">政策變更</h2>
        <p>
          網站功能調整時，這份政策可能會跟著更新，並修改頁面上方的更新日期。繼續使用本站即表示你了解當時的政策內容。
        </p>
      </section>
    </article>
  </main>
</template>

<style scoped></style>
