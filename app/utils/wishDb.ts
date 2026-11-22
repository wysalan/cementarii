import type { WishAccount, WishRecord } from "./wish";

const DB_NAME = "cementarii-wish";
const ACCOUNTS = "accounts";
const RECORDS = "records";

function request<T>(req: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

let opening: Promise<IDBDatabase> | undefined;

function open() {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(ACCOUNTS, { keyPath: "uid" });
      req.result.createObjectStore(RECORDS, { keyPath: ["uid", "id"] }).createIndex("uid", "uid");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  // 開啟失敗（例如無痕模式停用了 IndexedDB）時，下次呼叫要能重試
  opening.catch(() => (opening = undefined));
  return opening;
}

export async function listWishAccounts() {
  const db = await open();
  return request<WishAccount[]>(db.transaction(ACCOUNTS).objectStore(ACCOUNTS).getAll());
}

export async function getWishRecords(uid: string) {
  const db = await open();
  return request<WishRecord[]>(
    db.transaction(RECORDS).objectStore(RECORDS).index("uid").getAll(uid),
  );
}

/** 在同一個交易裡寫入帳號與紀錄的變動，中途失敗就全部不生效 */
export async function saveWishRecords(
  account: WishAccount,
  changes: { put: WishRecord[]; remove: string[] },
) {
  const db = await open();
  const tx = db.transaction([ACCOUNTS, RECORDS], "readwrite");
  const records = tx.objectStore(RECORDS);
  for (const id of changes.remove) records.delete([account.uid, id]);
  for (const record of changes.put) records.put(record);
  tx.objectStore(ACCOUNTS).put(account);
  await done(tx);
}

export async function deleteWishAccount(uid: string) {
  const db = await open();
  const tx = db.transaction([ACCOUNTS, RECORDS], "readwrite");
  tx.objectStore(ACCOUNTS).delete(uid);
  tx.objectStore(RECORDS).delete(IDBKeyRange.bound([uid, ""], [uid, "￿"]));
  await done(tx);
}
