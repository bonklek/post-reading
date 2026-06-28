import { registerBackgroundMessageHandlers, runNetworkTask } from "../../shared/backgroundRouter";

type FetchJsonMessage = {
  type: "post-reading:fetchJson";
  url: string;
};

type FetchTextMessage = {
  type: "post-reading:fetchText";
  url: string;
};

type BackgroundMessage = FetchJsonMessage | FetchTextMessage;

registerBackgroundMessageHandlers([{
  type: "post-reading:fetch",
  matches: isBackgroundMessage,
  handle: fetchPostReadingResource,
}]);

async function fetchPostReadingResource(message: BackgroundMessage): Promise<Record<string, unknown>> {
  try {
    if (!isAllowedFetchUrl(message.url)) {
      return { ok: false, status: 0, error: "URL is not allowed" };
    }
    const response = await runNetworkTask(
      () => fetch(message.url, { credentials: "omit" }),
      message.type,
    );
    if (!response.ok) return { ok: false, status: response.status, error: `HTTP ${response.status}` };
    if (message.type === "post-reading:fetchJson") return { ok: true, data: await response.json() };
    return { ok: true, text: await response.text() };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

function isBackgroundMessage(message: unknown): message is BackgroundMessage {
  if (!message || typeof message !== "object") return false;
  const record = message as Record<string, unknown>;
  return (record.type === "post-reading:fetchJson" || record.type === "post-reading:fetchText") && typeof record.url === "string";
}

function isAllowedFetchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return url.hostname === "x.com"
      || url.hostname === "twitter.com"
      || url.hostname === "publish.twitter.com"
      || url.hostname === "cdn.syndication.twimg.com";
  } catch {
    return false;
  }
}
