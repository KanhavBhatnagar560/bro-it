const MAX_SELECTION = 4000;
const MAX_CONTEXT = 8000;
const SEMANTIC_BLOCKS = "p, li, blockquote, td, th, dd, dt, figcaption, pre";

let lastCapture = null;
let currentRequestId = null;
let bubbleHost = null;
let anchorRange = null;
let fallbackRect = null;
let repositionQueued = false;

document.addEventListener("contextmenu", (event) => {
  lastCapture = captureSelection(event.target);
}, true);

document.addEventListener("pointerdown", (event) => {
  if (bubbleHost && !event.composedPath().includes(bubbleHost)) dismiss();
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") dismiss();
}, true);

document.addEventListener("selectionchange", () => {
  if (!bubbleHost || !lastCapture) return;
  queueMicrotask(() => {
    if (bubbleHost && !selectionStillMatches(lastCapture)) dismiss();
  });
});

window.addEventListener("scroll", queueReposition, true);
window.addEventListener("resize", queueReposition);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "BRO_IT_CAPTURE") {
    const capture = lastCapture || captureSelection(document.activeElement);
    if (!capture?.selection) {
      sendResponse({ ok: false, message: "Select some text first." });
      return;
    }
    if (capture.selection.length > MAX_SELECTION) {
      currentRequestId = message.requestId;
      showBubble("error", "Select a shorter passage (4,000 characters or fewer).");
      sendResponse({ ok: false, message: "Select a shorter passage (4,000 characters or fewer)." });
      return;
    }

    currentRequestId = message.requestId;
    sendResponse({
      ok: true,
      selection: capture.selection,
      context: capture.context.slice(0, MAX_CONTEXT)
    });
    return;
  }

  if (message.type === "BRO_IT_SHOW") {
    if (message.requestId !== currentRequestId) {
      sendResponse({ ok: false, stale: true });
      return;
    }
    currentRequestId = message.requestId;
    showBubble(message.state, message.text || "");
    sendResponse({ ok: true });
  }
});

function captureSelection(target) {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const selection = normalize(target.value.slice(start, end));
    if (!selection) return null;

    anchorRange = null;
    fallbackRect = target.getBoundingClientRect();
    return {
      selection,
      context: normalize(target.value).slice(0, MAX_CONTEXT),
      input: target
    };
  }

  const browserSelection = window.getSelection();
  if (!browserSelection || browserSelection.isCollapsed || !browserSelection.rangeCount) return null;

  const selection = normalize(browserSelection.toString());
  if (!selection) return null;

  anchorRange = browserSelection.getRangeAt(0).cloneRange();
  fallbackRect = rangeRect(anchorRange);
  const node = anchorRange.commonAncestorContainer;
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  const block = element?.closest(SEMANTIC_BLOCKS) || nearestBlock(element);
  const context = normalize(block?.innerText || block?.textContent || selection);

  return { selection, context: context.slice(0, MAX_CONTEXT), input: null };
}

function nearestBlock(element) {
  let current = element;
  while (current && current !== document.body) {
    const display = getComputedStyle(current).display;
    if (!["inline", "contents"].includes(display)) return current;
    current = current.parentElement;
  }
  return element;
}

function selectionStillMatches(capture) {
  if (capture.input) {
    const start = capture.input.selectionStart ?? 0;
    const end = capture.input.selectionEnd ?? 0;
    return normalize(capture.input.value.slice(start, end)) === capture.selection;
  }
  return normalize(window.getSelection()?.toString() || "") === capture.selection;
}

function showBubble(state, text) {
  if (!bubbleHost) {
    bubbleHost = document.createElement("div");
    bubbleHost.id = "bro-it-root";
    bubbleHost.setAttribute("role", "status");
    bubbleHost.setAttribute("aria-live", "polite");
    document.documentElement.appendChild(bubbleHost);
  }

  const shadow = bubbleHost.shadowRoot || bubbleHost.attachShadow({ mode: "open" });
  shadow.replaceChildren();

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; position: fixed; z-index: 2147483647; pointer-events: auto; }
    .card { box-sizing: border-box; width: max-content; max-width: min(380px, calc(100vw - 24px));
      padding: 10px 12px; border: 1px solid rgba(20, 24, 32, .14); border-radius: 12px;
      color: #172019; background: rgba(250, 251, 247, .98); box-shadow: 0 10px 32px rgba(16, 24, 20, .18);
      font: 500 13px/1.45 ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, sans-serif;
      letter-spacing: -.01em; overflow-wrap: anywhere; }
    .head { display: flex; align-items: center; gap: 7px; margin-bottom: 4px; color: #39724e;
      font-size: 11px; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
    .dot { width: 7px; height: 7px; border-radius: 999px; background: #4d9a68; }
    .loading .dot { animation: pulse .9s ease-in-out infinite alternate; }
    .error { color: #8a2f2f; border-color: rgba(138, 47, 47, .2); }
    .error .head { color: #8a2f2f; }
    .error .dot { background: #b64e4e; }
    @keyframes pulse { to { transform: scale(1.55); opacity: .35; } }
    @media (prefers-reduced-motion: reduce) { .loading .dot { animation: none; } }
  `;

  const card = document.createElement("div");
  card.className = `card ${state}`;
  const head = document.createElement("div");
  head.className = "head";
  const dot = document.createElement("span");
  dot.className = "dot";
  head.append(dot, document.createTextNode(state === "loading" ? "Bro is thinking" : state === "error" ? "Bro got stuck" : "Bro says"));
  const body = document.createElement("div");
  body.textContent = state === "loading" ? "Making this make sense…" : text;
  card.append(head, body);
  shadow.append(style, card);
  positionBubble();
}

function rangeRect(range) {
  const rects = range?.getClientRects?.();
  return rects?.length ? rects[rects.length - 1] : range?.getBoundingClientRect?.();
}

function positionBubble() {
  if (!bubbleHost) return;
  const rect = rangeRect(anchorRange) || fallbackRect;
  if (!rect) return;

  bubbleHost.style.left = "0px";
  bubbleHost.style.top = "0px";
  const bubbleRect = bubbleHost.getBoundingClientRect();
  const margin = 12;
  const left = Math.min(Math.max(rect.left, margin), window.innerWidth - bubbleRect.width - margin);
  const below = rect.bottom + 8;
  const top = below + bubbleRect.height <= window.innerHeight - margin
    ? below
    : Math.max(margin, rect.top - bubbleRect.height - 8);

  bubbleHost.style.left = `${left}px`;
  bubbleHost.style.top = `${top}px`;
}

function queueReposition() {
  if (!bubbleHost || repositionQueued) return;
  repositionQueued = true;
  requestAnimationFrame(() => {
    repositionQueued = false;
    positionBubble();
  });
}

function dismiss() {
  bubbleHost?.remove();
  bubbleHost = null;
  currentRequestId = null;
}

function normalize(value) {
  return value.replace(/\s+/g, " ").trim();
}
