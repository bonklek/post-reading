/** Public declarations consumed from milXdy App SDK 0.2.3. */

export type TwitterSurfaceKind = "tweet" | "xArticle" | "userCell" | "notification" | "directMessage" | "profile";

export interface TwitterSurface {
  kind: TwitterSurfaceKind;
  element: HTMLElement;
  handle: string | null;
  avatarUrl: string | null;
  textContainers: HTMLElement[];
  statusUrl: string | null;
  actionRow: HTMLElement | null;
  cacheKey: string;
  emittedAt: number;
}

export interface MilxdyRouteChange {
  href: string;
  pathname: string;
  previousHref: string | null;
  visible: boolean;
  changedAt: number;
}

export type Disposable = (() => void) | { dispose(): void };

export interface MilxdyContentAppContext {
  readonly manifest: {
    id: string;
    name: string;
    version: string;
    description: string;
  };
  readonly signal: AbortSignal;
  readonly scheduler: {
    idle(callback: () => void, options?: { timeout?: number }): () => void;
    timeout(callback: () => void, delayMs: number): () => void;
  };
  requestSurfaceRescan(): void;
  sendMessage<T = unknown>(message: unknown, label?: string): Promise<T | null>;
  recordDiagnostic(key: string, value: unknown): void;
  addDisposable(disposable: Disposable): void;
}
