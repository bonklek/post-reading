import type { AppStorageArea, AppStorageFacade } from "./appPlatform";

export function createChromeAppStorage(): AppStorageFacade {
  return {
    local: createArea("local"),
    sync: createArea("sync"),
  };
}

function createArea(area: "local" | "sync"): AppStorageArea {
  const storage = area === "local" ? chrome.storage.local : chrome.storage.sync;
  return {
    async get(defaults) {
      if (!globalThis.chrome?.storage?.[area]) return defaults;
      return await storage.get(defaults as never) as typeof defaults;
    },
    async set(values) {
      if (!globalThis.chrome?.storage?.[area]) return;
      await storage.set(values);
    },
    async remove(keys) {
      if (!globalThis.chrome?.storage?.[area]) return;
      await storage.remove(typeof keys === "string" ? keys : [...keys]);
    },
    onChanged(listener) {
      if (!globalThis.chrome?.storage?.onChanged) return () => undefined;
      const chromeListener = (changes: Record<string, chrome.storage.StorageChange>, changedArea: string) => {
        if (changedArea === area) listener(changes);
      };
      chrome.storage.onChanged.addListener(chromeListener);
      return () => chrome.storage.onChanged.removeListener(chromeListener);
    },
  };
}
