/** 底色往左右延伸的距離（px） */
const EXTEND = 2;

/** 緊接在標記後面的內容的第一個方框；後面沒有內容或是換行時回傳 undefined */
function nextRect(span: Element): DOMRect | undefined {
  const node = span.nextSibling;
  if (!node || node.nodeName === "BR") return undefined;
  if (node.nodeType !== Node.TEXT_NODE) return (node as Element).getClientRects()[0];
  if (!node.textContent) return undefined;
  const range = document.createRange();
  range.setStart(node, 0);
  range.setEnd(node, 1);
  return range.getClientRects()[0];
}

/** 標記每一行的範圍：內部的連結、顏色標籤會把同一行切成多個方框，合併成一行一個 */
function lines(span: Element): DOMRect[] {
  const out: DOMRect[] = [];
  for (const r of span.getClientRects()) {
    if (!r.width) continue;
    const line = out.find((l) => r.top < l.bottom - 2 && r.bottom > l.top + 2);
    if (!line) {
      out.push(DOMRect.fromRect(r));
      continue;
    }
    const left = Math.min(line.left, r.left);
    const top = Math.min(line.top, r.top);
    line.width = Math.max(line.right, r.right) - left;
    line.height = Math.max(line.bottom, r.bottom) - top;
    line.x = left;
    line.y = top;
  }
  return out;
}

/**
 * 在描述文字後面逐行畫出「新增」句子（`span.ability-diff-new`）的底色。
 * 不用 CSS 背景是因為換行後每一段只能套用同一組左右延伸；這裡只在行首／行尾的一側延伸，避免蓋到相鄰的句號
 * @param el 描述文字的元素（需要 `relative isolate`）
 */
export function useDiffOverlay(el: Ref<HTMLElement | null>, active: Ref<boolean>) {
  let overlay: HTMLElement | null = null;
  const clear = () => {
    overlay?.remove();
    overlay = null;
  };

  const draw = () => {
    clear();
    const root = el.value;
    if (!root || !active.value) return;
    const spans = root.querySelectorAll("span.ability-diff-new");
    if (!spans.length) return;
    const box = root.getBoundingClientRect();
    // 絕對定位的原點：內距框的左上角，並跟著捲動位置
    const originX = box.left + root.clientLeft - root.scrollLeft;
    const originY = box.top + root.clientTop - root.scrollTop;
    const lineStart = box.left + root.clientLeft + parseFloat(getComputedStyle(root).paddingLeft);

    overlay = document.createElement("div");
    overlay.className = "diff-overlay";
    for (const span of spans) {
      const next = nextRect(span);
      lines(span).forEach((r, i, rects) => {
        const left = r.left - lineStart < 1 ? EXTEND : 0;
        // 不是最後一行＝這行在標記中間換行；最後一行則看後面的內容是否換到下一行
        const atLineEnd = i < rects.length - 1 || !next || next.top >= r.bottom - 1;
        const right = atLineEnd ? EXTEND : 0;
        const block = document.createElement("div");
        block.style.left = `${r.left - originX - left}px`;
        block.style.top = `${r.top - originY}px`;
        block.style.width = `${r.width + left + right}px`;
        block.style.height = `${r.height}px`;
        overlay!.append(block);
      });
    }
    root.append(overlay);
  };

  // 寬度改變會影響換行位置，需要重畫
  watch(
    [el, active],
    ([root, on], _, onCleanup) => {
      draw();
      if (!root || !on) return;
      const observer = new ResizeObserver(draw);
      observer.observe(root);
      onCleanup(() => observer.disconnect());
    },
    { flush: "post" },
  );
  onBeforeUnmount(clear);
}
