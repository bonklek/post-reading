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

const FETCH_TIMEOUT_MS = 15000;

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
    return await runNetworkTask<Record<string, unknown>>(
      async () => {
        // Bound the whole request, body included, so a stalled connection cannot hold a network queue slot forever.
        const response = await fetch(message.url, { credentials: "omit", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (!response.ok) return { ok: false, status: response.status, error: `HTTP ${response.status}` };
        if (message.type === "post-reading:fetchJson") return { ok: true, data: await response.json() };
        return { ok: true, text: await response.text() };
      },
      message.type,
    );
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
