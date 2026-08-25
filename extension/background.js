const MENU_ID = "bro-it-explain";
const HOST_NAME = "com.broit.native";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Bro it",
      contexts: ["selection"],
      documentUrlPatterns: ["http://*/*", "https://*/*"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) return;

  const requestId = crypto.randomUUID();
  const frameId = info.frameId ?? 0;

  try {
    const capture = await sendToPage(tab.id, frameId, {
      type: "BRO_IT_CAPTURE",
      requestId
    });

    if (!capture?.ok) {
      await showError(tab.id, frameId, requestId, capture?.message || "Select some text first.");
      return;
    }

    await sendToPage(tab.id, frameId, {
      type: "BRO_IT_SHOW",
      requestId,
      state: "loading"
    });

    const response = await chrome.runtime.sendNativeMessage(HOST_NAME, {
      version: 1,
      action: "explain",
      requestId,
      selection: capture.selection,
      context: capture.context
    });

    await sendToPage(tab.id, frameId, {
      type: "BRO_IT_SHOW",
      requestId,
      state: response?.ok ? "success" : "error",
      text: response?.ok ? response.text : response?.message || "Codex could not explain this selection."
    });
  } catch (error) {
    await showError(tab.id, frameId, requestId, friendlyError(error)).catch(() => {});
  }
});

function sendToPage(tabId, frameId, message) {
  return chrome.tabs.sendMessage(tabId, message, { frameId });
}

function showError(tabId, frameId, requestId, text) {
  return sendToPage(tabId, frameId, {
    type: "BRO_IT_SHOW",
    requestId,
    state: "error",
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
