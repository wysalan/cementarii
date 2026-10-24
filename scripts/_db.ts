// 給本機存取資料庫用的連線工具（使用 tsx 執行，直連 Neon、不經過 Hyperdrive）
import { createDb } from "../server/db/client";

export const db = createDb(process.env.DATABASE_URL!); // Neon 直連網址
export const closeDb = () => db.$client.end(); // 結束前一定要呼叫，否則程序不會退出
