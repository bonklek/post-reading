import type { PostReadingContentAppContext } from "../../shared/appPlatform";

let runtimeResolveAssetUrl: PostReadingContentAppContext["resolveAssetUrl"] | null = null;

export function configurePostReadingAssetResolver(resolveAssetUrl: PostReadingContentAppContext["resolveAssetUrl"] | null): void {
  runtimeResolveAssetUrl = resolveAssetUrl;
}

export function postReadingAssetUrl(path: string): string {
  if (!runtimeResolveAssetUrl) throw new Error("Post-reading asset capability unavailable");
  return runtimeResolveAssetUrl(path);
}
