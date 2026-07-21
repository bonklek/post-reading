import {
  boot as bootPostReading,
  close,
  disable,
  dispose,
  onSurface,
  open,
} from "../features/post-reading/content";
import type { PostReadingContentAppContext } from "../shared/appPlatform";
import type { MilxdyContentAppContext } from "../../sdk/milxdy-app-sdk";

export async function boot(context: MilxdyContentAppContext): Promise<void> {
  const adaptedContext: PostReadingContentAppContext = {
    ...context,
    manifest: {
      id: context.manifest.id,
      name: context.manifest.name,
      version: context.manifest.version,
      description: context.manifest.description,
      contentEntry: "dist/content.js",
      defaultEnabled: false,
      storageKeys: {
        sync: ["enabled"],
        local: ["voiceBoundarySupportV2"],
      },
      surfaces: ["tweet", "xArticle", "overlayApp"],
      cost: {
        startup: "moderate",
        perSurface: "moderate",
        network: "batched",
        worker: "optional",
        domWrite: "moderate",
      },
      loadTriggers: ["surface", "userAction"],
      package: {},
      isEnabled: async () => true,
    },
    requestSurfaceRescan: context.requestSurfaceRescan,
    scheduleScan: context.requestSurfaceRescan,
    loadAppById: async () => null,
  };
  await bootPostReading(adaptedContext);
}

export { close, disable, dispose, onSurface, open };
