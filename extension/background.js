const ROOT_MENU_ID = "bro-it-root";
const EXPLAIN_MENU_ID = "bro-it-explain";
const ANSWER_MENU_ID = "bro-it-answer";
const HOST_NAME = "com.broit.native";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    const menuOptions = {
      contexts: ["selection"],
      documentUrlPatterns: ["http://*/*", "https://*/*"]
    };
    chrome.contextMenus.create({
      ...menuOptions,
      id: ROOT_MENU_ID,
      title: "Bro It"
    });
    chrome.contextMenus.create({
      ...menuOptions,
      id: EXPLAIN_MENU_ID,
      parentId: ROOT_MENU_ID,
      title: "Bro it — explain simply"
    });
    chrome.contextMenus.create({
      ...menuOptions,
      id: ANSWER_MENU_ID,
      parentId: ROOT_MENU_ID,
      title: "Answer it — answer the question"
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const mode = info.menuItemId === EXPLAIN_MENU_ID
    ? "explain"
    : info.menuItemId === ANSWER_MENU_ID ? "answer" : null;
  if (!mode || !tab?.id) return;

  const requestId = crypto.randomUUID();
  const frameId = info.frameId ?? 0;

  try {
    const capture = await sendToPage(tab.id, frameId, {
      type: "BRO_IT_CAPTURE",
      requestId
    });

    if (!capture?.ok) {
      await showError(tab.id, frameId, requestId, mode, capture?.message || "Select some text first.");
      return;
    }

    await sendToPage(tab.id, frameId, {
      type: "BRO_IT_SHOW",
      requestId,
      state: "loading",
      mode
    });

    const response = await chrome.runtime.sendNativeMessage(HOST_NAME, {
      version: 1,
      action: mode,
      requestId,
      selection: capture.selection,
      context: capture.context
    });

    await sendToPage(tab.id, frameId, {
      type: "BRO_IT_SHOW",
      requestId,
      state: response?.ok ? "success" : "error",
      mode,
      text: response?.ok ? response.text : response?.message || "Codex could not process this selection."
    });
  } catch (error) {
    await showError(tab.id, frameId, requestId, mode, friendlyError(error)).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "BRO_IT_FOLLOWUP") return;

  chrome.runtime.sendNativeMessage(HOST_NAME, {
    version: 1,
    action: "followup",
    requestId: message.requestId,
    selection: message.selection,
    context: message.context,
    previousAnswer: message.previousAnswer,
    question: message.question
  }).then((response) => {
    sendResponse(response);
  }).catch((error) => {
    sendResponse({ ok: false, message: friendlyError(error) });
  });

  return true;
});

function sendToPage(tabId, frameId, message) {
  return chrome.tabs.sendMessage(tabId, message, { frameId });
}

function showError(tabId, frameId, requestId, mode, text) {
  return sendToPage(tabId, frameId, {
    type: "BRO_IT_SHOW",
    requestId,
    state: "error",
    mode,
    text
  });
}

function friendlyError(error) {
  const message = String(error?.message || error);
  if (/native messaging host.*not found|specified native messaging host/i.test(message)) {
    return "Bro It's helper is not installed. Run ./scripts/install.sh from the project folder.";
  }
  if (/receiving end does not exist|could not establish connection/i.test(message)) {
    return "Bro It cannot run on this page. Try a regular website tab.";
  }
  return "Bro It hit an unexpected error. Try again.";
}
