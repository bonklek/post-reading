import { boot, onSurface } from "../../features/post-reading/content";
import type { PostReadingContentAppContext } from "../../shared/appPlatform";
import type { Disposable } from "../../shared/disposables";
import { safeRuntimeMessage } from "../../shared/extensionRuntime";
import { scheduleTwitterScan, subscribeTwitterSurfaces } from "../../shared/twitterScanner";

const controller = new AbortController();
const disposables: Disposable[] = [];

void bootStandalonePostReading();

async function bootStandalonePostReading(): Promise<void> {
  document.documentElement.dataset.postReadingPerformanceMode ||= "balanced";

  const context: PostReadingContentAppContext = {
    manifest: {
      id: "post-reading",
      name: "Post-reading",
      version: "0.1.0",
      description: "Read-aloud controls for X/Twitter posts.",
      contentEntry: "content.js",
      defaultEnabled: true,
      storageKeys: {
        sync: [
          "enabled",
          "speed",
          "volume",
          "voiceURI",
          "autoVoice",
          "ttsEngine",
          "customTtsEndpoint",
          "customTtsTimingMode",
          "autoplayNext",
          "autoplayMode",
          "skipPromotedPosts",
          "endOfTweetDing",
          "includeQuotes",
          "fetchFullQuotes",
          "fullQuoteDisplay",
          "includeHyperlinks",
          "includeImageAltText",
          "includeImageOcr",
          "includeLinkPreviews",
          "expandShowMore",
          "activeTweetHighlight",
          "bodyHighlightMode",
          "playerPosition",
          "buttonPlacement",
          "useHandles",
          "keyNextTweet",
          "keyPreviousTweet",
          "keyNextChunk",
          "keyPreviousChunk",
          "keySkipOcr",
          "keyPlayPause",
        ],
        local: ["voiceBoundarySupportV2"],
      },
      surfaces: ["tweet"],
      cost: {
        startup: "moderate",
        perSurface: "moderate",
        network: "batched",
        worker: "optional",
        domWrite: "moderate",
      },
      loadTriggers: ["startup", "surface", "userAction"],
      package: {
        assets: ["post-reading"],
        webAccessibleAssets: ["post-reading/*", "ocr.html", "ocrHost.js", "ocr/*"],
      },
      isEnabled: async () => true,
    },
    signal: controller.signal,
    scheduleScan: scheduleTwitterScan,
    loadAppById: async () => null,
    scheduler: {
      idle(callback, options) {
        if (typeof window.requestIdleCallback === "function") {
          const id = window.requestIdleCallback(callback, { timeout: options?.timeout });
          return () => window.cancelIdleCallback(id);
        }
        const id = window.setTimeout(callback, Math.min(options?.timeout ?? 16, 250));
        return () => window.clearTimeout(id);
      },
      timeout(callback, delayMs) {
        const id = window.setTimeout(callback, delayMs);
        return () => window.clearTimeout(id);
      },
    },
    sendMessage: (message) => safeRuntimeMessage(message),
    recordDiagnostic: () => undefined,
    addDisposable(disposable) {
      disposables.push(disposable);
    },
  };

  await boot(context);
  disposables.push(subscribeTwitterSurfaces(onSurface));
}

window.addEventListener("pagehide", () => {
  controller.abort();
  for (const disposable of disposables.splice(0)) {
    if (typeof disposable === "function") disposable();
    else disposable.dispose();
  }
}, { once: true });
