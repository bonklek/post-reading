import type { TwitterSurface, TwitterSurfaceKind } from "./twitterScanner";
import type { Disposable } from "./disposables";

export type PostReadingAppId = string;

export type PostReadingAppSurface = TwitterSurfaceKind | "xArticle" | "route" | "overlayApp";
export type AppCostLevel = "cheap" | "moderate" | "heavy";
export type AppNetworkCost = "none" | "batched" | "eager";
export type AppWorkerCost = "none" | "optional" | "heavy";
export type AppDomWriteCost = "small" | "moderate" | "large";
export type AppLoadTrigger = "startup" | "surface" | "idle" | "userAction";
export type AppHubCategory = "appearance" | "reading" | "social" | "game" | "media" | "developer";
export type AppPreset = "lite" | "balanced" | "full";
export type AppPrivacyLabel = "local-only" | "browser-session" | "remote-api" | "local-files" | "diagnostics";

export type AppStorageChange = { oldValue?: unknown; newValue?: unknown };
export type AppStorageArea = {
  get<T extends Record<string, unknown>>(defaults: T): Promise<T>;
  set(values: Record<string, unknown>): Promise<void>;
  remove(keys: string | readonly string[]): Promise<void>;
  onChanged(listener: (changes: Record<string, AppStorageChange>) => void): () => void;
};
export type AppStorageFacade = { local: AppStorageArea; sync: AppStorageArea };

export type AppCostProfile = {
  startup: AppCostLevel;
  perSurface: AppCostLevel;
  network: AppNetworkCost;
  worker: AppWorkerCost;
  domWrite: AppDomWriteCost;
};

export type PostReadingAppManifest = {
  id: PostReadingAppId;
  name: string;
  version: string;
  description: string;
  contentEntry: string;
  available?: boolean;
  unavailableReason?: string;
  css?: Array<{ id: string; path: string }>;
  defaultEnabled: boolean;
  storageKeys: {
    sync?: string[];
    local?: string[];
  };
  surfaces: PostReadingAppSurface[];
  deliverySurfaces?: TwitterSurfaceKind[];
  cost: AppCostProfile;
  loadTriggers: AppLoadTrigger[];
  hub?: {
    category: AppHubCategory;
    shortDescription: string;
    longDescription?: string;
    presets: AppPreset[];
    permissionNotes?: string[];
    dataNotes?: string[];
    remoteServices?: string[];
    localStorageNotes?: string[];
    privacyLabels?: AppPrivacyLabel[];
  };
  permissions?: {
    hosts?: string[];
    optional?: string[];
  };
  background?: {
    messageTypes?: string[];
    services?: string[];
  };
  package: {
    assets?: string[];
    webAccessibleAssets?: string[];
  };
  isEnabled: () => Promise<boolean>;
  setEnabled?: (enabled: boolean) => Promise<void>;
};

export type AppRuntimeScheduler = {
  idle: (callback: () => void, options?: { timeout?: number }) => () => void;
  timeout: (callback: () => void, delayMs: number) => () => void;
};

export type PostReadingContentAppContext = {
  manifest: PostReadingAppManifest;
  signal: AbortSignal;
  requestSurfaceRescan: () => void;
  /** @deprecated Standalone compatibility alias. milXdy packages use requestSurfaceRescan. */
  scheduleScan: () => void;
  loadAppById: (id: PostReadingAppId, reason?: string) => Promise<PostReadingContentAppModule | null>;
  scheduler: AppRuntimeScheduler;
  storage: AppStorageFacade;
  resolveAssetUrl: (path: string) => string;
  sendMessage: <T = unknown>(message: unknown, label?: string) => Promise<T | null>;
  recordDiagnostic: (key: string, value: unknown) => void;
  addDisposable: (disposable: Disposable) => void;
};

export type PostReadingContentAppModule = {
  id?: string;
  boot?: (context: PostReadingContentAppContext) => Promise<void> | void;
  enable?: () => Promise<void> | void;
  disable?: () => Promise<void> | void;
  onRouteChange?: (route: PostReadingRouteChange) => Promise<void> | void;
  onSurface?: (surface: TwitterSurface) => Promise<void> | void;
  open?: () => Promise<void> | void;
  close?: () => Promise<void> | void;
  dispose?: () => Promise<void> | void;
};

export type PostReadingRouteChange = {
  href: string;
  pathname: string;
  previousHref: string | null;
  visible: boolean;
  changedAt: number;
};

export type AppLoadState = "pending" | "disabled" | "loaded" | "failed";

export type AppDiagnostics = {
  id: PostReadingAppId;
  state: AppLoadState;
  contentEntry: string;
  available?: boolean;
  unavailableReason?: string;
  hub?: {
    category: AppHubCategory;
    presets: AppPreset[];
  };
  loadedAt?: number;
  loadMs?: number;
  deferredReason?: string;
  error?: string;
};
