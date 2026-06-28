export type OverlayDockSide = "left" | "right";

export type OverlayDockItem = {
  id: string;
  label: string;
  icon: string;
  badgeText?: string;
  active?: boolean;
  title?: string;
  onActivate: () => void;
  onDeactivate?: () => void;
  onSideChange?: (side: OverlayDockSide) => void;
};

export type OverlayDockRegistration = {
  update: (item: Partial<Omit<OverlayDockItem, "id" | "onActivate" | "onDeactivate">>) => void;
  remove: () => void;
};

export type OverlayDockSettingsAction = {
  label: string;
  title?: string;
  onActivate: () => void;
};

type DockState = {
  root: HTMLElement | null;
  items: Map<string, OverlayDockItem>;
  side: OverlayDockSide;
  order: string[];
  hiddenItems: Set<string>;
  settingsActions: Map<string, OverlayDockSettingsAction>;
  reorderMode: boolean;
  settingsOpen: boolean;
  loaded: boolean;
  loadPromise: Promise<void> | null;
  drag: {
    id: string;
    pointerId: number;
    startY: number;
    moved: boolean;
    element: HTMLElement;
  } | null;
  longPressTimer: number | null;
  suppressClick: boolean;
};

type DockApi = {
  register: (item: OverlayDockItem) => OverlayDockRegistration;
  getSide: () => OverlayDockSide;
  setSide: (side: OverlayDockSide) => void;
  setHiddenItems: (ids: readonly string[]) => void;
  setSettingsAction: (id: string, action: OverlayDockSettingsAction | null) => void;
  subscribeSide: (callback: (side: OverlayDockSide) => void) => () => void;
};

const ROOT_ID = "postReading-overlay-dock-root";
const STYLE_ID = "postReading-overlay-dock-style";
const SIDE_KEY = "postReading.overlayDock.side";
const ORDER_KEY = "postReading.overlayDock.order";
const LONG_PRESS_MS = 520;
const globalKey = "__postReadingOverlayDock";

const sideListeners = new Set<(side: OverlayDockSide) => void>();

function createDockApi(): DockApi {
  const state: DockState = {
    root: null,
    items: new Map(),
    side: "left",
    order: [],
    hiddenItems: new Set(),
    settingsActions: new Map(),
    reorderMode: false,
    settingsOpen: false,
    loaded: false,
    loadPromise: null,
    drag: null,
    longPressTimer: null,
    suppressClick: false,
  };

  function register(item: OverlayDockItem): OverlayDockRegistration {
    state.items.set(item.id, { ...item });
    if (!state.order.includes(item.id)) state.order.push(item.id);
    void ensureLoaded().then(() => {
      ensureRoot();
      render();
      item.onSideChange?.(state.side);
    });

    return {
      update(update) {
        const current = state.items.get(item.id);
        if (!current) return;
        if (!hasItemChanges(current, update)) return;
        state.items.set(item.id, { ...current, ...update });
        render();
      },
      remove() {
        state.items.delete(item.id);
        render();
      },
    };
  }

  function getSide(): OverlayDockSide {
    return state.side;
  }

  function setSide(side: OverlayDockSide): void {
    if (state.side === side) return;
    state.side = side;
    void chrome.storage.local.set({ [SIDE_KEY]: side });
    notifySide();
    render();
  }

  function setHiddenItems(ids: readonly string[]): void {
    state.hiddenItems = new Set(ids);
    render();
  }

  function setSettingsAction(id: string, action: OverlayDockSettingsAction | null): void {
    if (action) state.settingsActions.set(id, action);
    else state.settingsActions.delete(id);
    render();
  }

  function subscribeSide(callback: (side: OverlayDockSide) => void): () => void {
    sideListeners.add(callback);
    callback(state.side);
    return () => sideListeners.delete(callback);
  }

  function notifySide(): void {
    for (const listener of sideListeners) listener(state.side);
    for (const item of state.items.values()) item.onSideChange?.(state.side);
  }

  async function ensureLoaded(): Promise<void> {
    if (state.loaded) return;
    if (state.loadPromise) return state.loadPromise;
    state.loadPromise = chrome.storage.local.get({ [SIDE_KEY]: "left", [ORDER_KEY]: [] })
      .then((stored) => {
        state.side = stored[SIDE_KEY] === "right" ? "right" : "left";
        state.order = Array.isArray(stored[ORDER_KEY])
          ? stored[ORDER_KEY].filter((id): id is string => typeof id === "string")
          : [];
        state.loaded = true;
        notifySide();
      })
      .catch(() => {
        state.loaded = true;
      });
    return state.loadPromise;
  }

  function ensureRoot(): void {
    injectStyles();
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement("aside");
      root.id = ROOT_ID;
      root.setAttribute("aria-label", "Post-reading overlay dock");
      document.documentElement.appendChild(root);
    }
    state.root = root;
  }

  function orderedItems(): OverlayDockItem[] {
    const ids = new Set(state.order);
    const missing = Array.from(state.items.keys()).filter((id) => !ids.has(id));
    if (missing.length) state.order.push(...missing);
    return state.order
      .map((id) => state.items.get(id))
      .filter((item): item is OverlayDockItem => item != null && !state.hiddenItems.has(item.id));
  }

  function hasItemChanges(
    current: OverlayDockItem,
    update: Partial<Omit<OverlayDockItem, "id" | "onActivate" | "onDeactivate">>,
  ): boolean {
    for (const key of Object.keys(update) as Array<keyof typeof update>) {
      if (current[key] !== update[key]) return true;
    }
    return false;
  }

  function render(): void {
    const root = state.root;
    if (!root) return;
    root.dataset.side = state.side;
    root.dataset.reorder = String(state.reorderMode);
    root.dataset.settingsOpen = String(state.settingsOpen);

    let rail = root.querySelector<HTMLElement>(":scope > .postReading-overlay-dock-rail");
    if (!rail) {
      rail = document.createElement("div");
      rail.className = "postReading-overlay-dock-rail";
      root.prepend(rail);
    }

    const items = orderedItems();
    const renderedItemIds = new Set(items.map((item) => item.id));

    for (const button of Array.from(rail.querySelectorAll<HTMLButtonElement>(":scope > .postReading-overlay-dock-item[data-item-id]"))) {
      const itemId = button.dataset.itemId;
      if (!itemId || !renderedItemIds.has(itemId)) button.remove();
    }

    let nextNode: ChildNode | null = rail.firstChild;
    for (const item of items) {
      const button = findItemButton(rail, item.id) || createItemButton(item.id);
      updateItemButton(button, item);
      if (button !== nextNode) rail.insertBefore(button, nextNode);
      nextNode = button.nextSibling;
    }

    const gear = rail.querySelector<HTMLButtonElement>(":scope > .postReading-overlay-dock-gear") || createGearButton();
    if (gear !== nextNode) rail.insertBefore(gear, nextNode);

    const settings = root.querySelector<HTMLElement>(":scope > .postReading-overlay-dock-settings");
    if (settings) settings.remove();
    if (state.settingsOpen) root.append(createSettingsPanel());
  }

  function findItemButton(rail: HTMLElement, id: string): HTMLButtonElement | null {
    for (const button of Array.from(rail.querySelectorAll<HTMLButtonElement>(":scope > .postReading-overlay-dock-item[data-item-id]"))) {
      if (button.dataset.itemId === id) return button;
    }
    return null;
  }

  function createItemButton(id: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "postReading-overlay-dock-item";
    button.type = "button";
    button.dataset.itemId = id;

    button.addEventListener("click", (event) => {
      if (state.reorderMode || state.suppressClick) {
        event.preventDefault();
        state.suppressClick = false;
        return;
      }
      const itemId = button.dataset.itemId;
      const item = itemId ? state.items.get(itemId) : null;
      if (!item) return;
      if (item.active && item.onDeactivate) item.onDeactivate();
      else item.onActivate();
    });
    button.addEventListener("pointerdown", (event) => {
      const itemId = button.dataset.itemId;
      if (itemId) startItemPointer(event, itemId);
    });
    attachDockHover(button);
    return button;
  }

  function createGearButton(): HTMLButtonElement {
    const gear = document.createElement("button");
    gear.className = "postReading-overlay-dock-item postReading-overlay-dock-gear";
    gear.type = "button";
    gear.title = "Dock settings";
    gear.setAttribute("aria-label", "Dock settings");
    const gearIcon = document.createElement("span");
    gearIcon.className = "postReading-overlay-dock-gear-icon";
    gearIcon.textContent = "\u2699";
    gear.append(gearIcon);
    attachDockHover(gear);
    gear.addEventListener("click", () => {
      state.settingsOpen = !state.settingsOpen;
      render();
    });
    return gear;
  }

  function updateItemButton(button: HTMLButtonElement, item: OverlayDockItem): void {
    const active = String(Boolean(item.active));
    const title = item.title || item.label;
    if (button.dataset.active !== active) button.dataset.active = active;
    if (button.title !== title) button.title = title;
    if (button.getAttribute("aria-label") !== item.label) button.setAttribute("aria-label", item.label);

    let icon = button.querySelector<HTMLElement>(":scope > .postReading-overlay-dock-icon");
    if (!icon) {
      icon = document.createElement("span");
      icon.className = "postReading-overlay-dock-icon";
      button.prepend(icon);
    }
    updateIcon(icon, item.icon);

    let badge = button.querySelector<HTMLElement>(":scope > .postReading-overlay-dock-badge");
    if (item.badgeText) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "postReading-overlay-dock-badge";
        button.append(badge);
      }
      if (badge.textContent !== item.badgeText) badge.textContent = item.badgeText;
    } else {
      badge?.remove();
    }
  }

  function updateIcon(icon: HTMLElement, value: string): void {
    if (icon.dataset.icon === value) return;
    icon.dataset.icon = value;
    icon.textContent = "";
    if (/^(https?:|chrome-extension:|moz-extension:|data:|\/)/.test(value)) {
      const image = document.createElement("img");
      image.src = value;
      image.alt = "";
      icon.append(image);
    } else {
      icon.textContent = value;
    }
  }

  function attachDockHover(button: HTMLButtonElement): void {
    const setHovered = () => {
      if (button.dataset.hovered !== "true") button.dataset.hovered = "true";
    };
    const clearHovered = () => {
      if (button.dataset.hovered === "true") delete button.dataset.hovered;
    };
    const isOutsideBoundary = (event: MouseEvent | PointerEvent) => {
      return !(event.relatedTarget instanceof Node) || !button.contains(event.relatedTarget);
    };

    button.addEventListener("pointerenter", setHovered);
    button.addEventListener("pointerleave", clearHovered);
    button.addEventListener("mouseover", (event) => {
      if (isOutsideBoundary(event)) setHovered();
    });
    button.addEventListener("mouseout", (event) => {
      if (isOutsideBoundary(event)) clearHovered();
    });
  }

  function startItemPointer(event: PointerEvent, id: string): void {
    if (event.button !== 0) return;
    const button = event.currentTarget as HTMLElement;
    state.drag = {
      id,
      pointerId: event.pointerId,
      startY: event.clientY,
      moved: false,
      element: button,
    };
    button.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", moveItemPointer);
    window.addEventListener("pointerup", endItemPointer);
    window.addEventListener("pointercancel", cancelItemPointer);
    if (state.longPressTimer !== null) window.clearTimeout(state.longPressTimer);
    state.longPressTimer = window.setTimeout(() => {
      state.reorderMode = true;
      state.longPressTimer = null;
      if (state.root) state.root.dataset.reorder = "true";
    }, LONG_PRESS_MS);
  }

  function moveItemPointer(event: PointerEvent): void {
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
    const delta = event.clientY - state.drag.startY;
    if (Math.abs(delta) < 8) return;
    state.drag.moved = true;
    if (state.longPressTimer !== null) {
      window.clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    if (!state.reorderMode) return;
    const root = state.root;
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-item-id]")
      : null;
    const targetId = target?.dataset.itemId;
    if (!root || !targetId || targetId === state.drag.id) return;
    const from = state.order.indexOf(state.drag.id);
    const to = state.order.indexOf(targetId);
    if (from === -1 || to === -1) return;
    state.order.splice(from, 1);
    state.order.splice(to, 0, state.drag.id);
    render();
  }

  function endItemPointer(event: PointerEvent): void {
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
    if (state.longPressTimer !== null) {
      window.clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    state.drag.element.releasePointerCapture?.(event.pointerId);
    state.suppressClick = state.drag.moved;
    if (state.reorderMode && state.drag.moved) saveOrder();
    state.drag = null;
    window.removeEventListener("pointermove", moveItemPointer);
    window.removeEventListener("pointerup", endItemPointer);
    window.removeEventListener("pointercancel", cancelItemPointer);
  }

  function cancelItemPointer(event: PointerEvent): void {
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
    if (state.longPressTimer !== null) {
      window.clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    state.drag = null;
    window.removeEventListener("pointermove", moveItemPointer);
    window.removeEventListener("pointerup", endItemPointer);
    window.removeEventListener("pointercancel", cancelItemPointer);
  }

  function saveOrder(): void {
    void chrome.storage.local.set({ [ORDER_KEY]: state.order });
  }

  function createSettingsPanel(): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "postReading-overlay-dock-settings";

    const title = document.createElement("strong");
    title.textContent = "Dock";

    const sideGroup = document.createElement("div");
    sideGroup.className = "postReading-overlay-dock-segment";
    sideGroup.append(
      sideButton("Left", "left"),
      sideButton("Right", "right"),
    );

    const reorder = document.createElement("button");
    reorder.type = "button";
    reorder.textContent = state.reorderMode ? "Done" : "Reorder";
    reorder.addEventListener("click", () => {
      state.reorderMode = !state.reorderMode;
      if (!state.reorderMode) saveOrder();
      render();
    });

    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "Reset order";
    reset.addEventListener("click", () => {
      state.order = Array.from(state.items.keys());
      saveOrder();
      render();
    });

    const actions = Array.from(state.settingsActions.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, action]) => settingsActionButton(action));

    panel.append(title, sideGroup, reorder, reset, ...actions);
    return panel;
  }

  function settingsActionButton(action: OverlayDockSettingsAction): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    if (action.title) button.title = action.title;
    button.addEventListener("click", () => {
      state.settingsOpen = false;
      action.onActivate();
      render();
    });
    return button;
  }

  function sideButton(label: string, side: OverlayDockSide): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.active = String(state.side === side);
    button.addEventListener("click", () => setSide(side));
    return button;
  }

  return { register, getSide, setSide, setHiddenItems, setSettingsAction, subscribeSide };
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} {
      --postReading-dock-bg: rgba(14, 15, 19, 0.92);
      --postReading-dock-border: rgba(252, 224, 150, 0.28);
      --postReading-dock-highlight: rgba(255, 244, 207, 0.11);
      --postReading-dock-shadow: rgba(0, 0, 0, 0.38);
      --postReading-dock-scrollbar: rgba(248, 211, 93, 0.72);
      --postReading-dock-gear-bg: rgba(215, 220, 255, 0.12);
      --postReading-dock-gear-ring: rgba(248, 211, 93, 0.5);
      --postReading-dock-gear-text: #eef0ff;
      --postReading-dock-top: 16px;
      --postReading-dock-bottom-clearance: 136px;
      position: fixed;
      top: var(--postReading-dock-top);
      z-index: 2147483646;
      color-scheme: light dark;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      user-select: none;
    }
    html[data-postReading-x-theme="light"] #${ROOT_ID},
    html:not([data-postReading-x-theme="dark"]):not([data-postReading-x-theme="dim"]) #${ROOT_ID} {
      --postReading-dock-bg: rgba(247, 248, 250, 0.94);
      --postReading-dock-border: rgba(70, 74, 108, 0.24);
      --postReading-dock-highlight: rgba(255, 255, 255, 0.72);
      --postReading-dock-shadow: rgba(15, 23, 42, 0.18);
      --postReading-dock-scrollbar: rgba(98, 107, 178, 0.58);
      --postReading-dock-gear-bg: rgba(98, 107, 178, 0.12);
      --postReading-dock-gear-ring: rgba(98, 107, 178, 0.34);
      --postReading-dock-gear-text: #464a6c;
      color-scheme: light;
    }
    html[data-postReading-x-theme="dark"] #${ROOT_ID},
    html[data-postReading-x-theme="dim"] #${ROOT_ID},
    html[style*="color-scheme: dark"] #${ROOT_ID} {
      --postReading-dock-bg: rgba(14, 15, 19, 0.92);
      --postReading-dock-border: rgba(252, 224, 150, 0.28);
      --postReading-dock-highlight: rgba(255, 244, 207, 0.11);
      --postReading-dock-shadow: rgba(0, 0, 0, 0.38);
      --postReading-dock-scrollbar: rgba(248, 211, 93, 0.72);
      --postReading-dock-gear-bg: rgba(215, 220, 255, 0.12);
      --postReading-dock-gear-ring: rgba(248, 211, 93, 0.5);
      --postReading-dock-gear-text: #eef0ff;
      color-scheme: dark;
    }
    @media (prefers-color-scheme: light) {
      html:not([data-postReading-x-theme="dark"]):not([data-postReading-x-theme="dim"]):not([style*="color-scheme: dark"]) #${ROOT_ID} {
        --postReading-dock-bg: rgba(247, 248, 250, 0.94);
        --postReading-dock-border: rgba(70, 74, 108, 0.24);
        --postReading-dock-highlight: rgba(255, 255, 255, 0.72);
        --postReading-dock-shadow: rgba(15, 23, 42, 0.18);
        --postReading-dock-scrollbar: rgba(98, 107, 178, 0.58);
        --postReading-dock-gear-bg: rgba(98, 107, 178, 0.12);
        --postReading-dock-gear-ring: rgba(98, 107, 178, 0.34);
        --postReading-dock-gear-text: #464a6c;
        color-scheme: light;
      }
    }
    #${ROOT_ID}[data-side="left"] { left: 8px; }
    #${ROOT_ID}[data-side="right"] { right: 8px; }
    .postReading-overlay-dock-rail {
      display: grid;
      justify-items: center;
      gap: 12px;
      width: 58px;
      max-height: calc(100vh - var(--postReading-dock-top) - var(--postReading-dock-bottom-clearance));
      padding: 9px 4px;
      overflow-x: hidden;
      overflow-y: auto;
      border: 1px solid var(--postReading-dock-border);
      border-right-width: 2px;
      border-bottom-width: 3px;
      border-radius: 8px;
      background:
        linear-gradient(180deg, var(--postReading-dock-highlight), rgba(255, 244, 207, 0) 34px),
        var(--postReading-dock-bg);
      box-shadow:
        inset 2px 2px 0 rgba(255, 255, 255, 0.13),
        0 16px 38px var(--postReading-dock-shadow);
      backdrop-filter: blur(12px);
      scrollbar-width: thin;
      scrollbar-color: var(--postReading-dock-scrollbar) transparent;
      scroll-snap-type: y proximity;
    }
    .postReading-overlay-dock-rail::-webkit-scrollbar {
      width: 5px;
    }
    .postReading-overlay-dock-rail::-webkit-scrollbar-track {
      background: transparent;
    }
    .postReading-overlay-dock-rail::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: var(--postReading-dock-scrollbar);
    }
    .postReading-overlay-dock-item {
      position: relative;
      display: grid;
      place-items: center;
      width: 50px;
      height: 50px;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: #fff4cf;
      cursor: pointer;
      font: 900 18px/1 inherit;
      scroll-snap-align: center;
      box-shadow: none;
      transition: background 140ms ease, filter 140ms ease;
    }
    .postReading-overlay-dock-item[data-hovered="true"],
    .postReading-overlay-dock-item[data-active="true"] {
      background: radial-gradient(circle, rgba(250, 220, 130, 0.28) 0 52%, transparent 72%);
      filter: brightness(1.08);
    }
    .postReading-overlay-dock-item[data-hovered="true"] {
      filter: brightness(1.08);
    }
    .postReading-overlay-dock-item[data-active="true"]::before {
      content: "";
      position: absolute;
      top: 8px;
      bottom: 8px;
      width: 3px;
      border-radius: 999px;
      background: #f8d35d;
      box-shadow: 0 0 10px rgba(248, 211, 93, 0.72);
    }
    #${ROOT_ID}[data-side="left"] .postReading-overlay-dock-item[data-active="true"]::before { left: -6px; }
    #${ROOT_ID}[data-side="right"] .postReading-overlay-dock-item[data-active="true"]::before { right: -6px; }
    #${ROOT_ID}[data-reorder="true"] .postReading-overlay-dock-item {
      cursor: grab;
      animation: postReading-dock-wiggle 150ms infinite alternate ease-in-out;
    }
    .postReading-overlay-dock-icon,
    .postReading-overlay-dock-icon img {
      display: block;
      width: 44px;
      height: 44px;
    }
    .postReading-overlay-dock-icon {
      display: grid;
      place-items: center;
      overflow: hidden;
      border-radius: 8px;
      transform: scale(1);
      transform-origin: center;
      transition: transform 140ms ease;
      will-change: transform;
      pointer-events: none;
    }
    .postReading-overlay-dock-item[data-hovered="true"] .postReading-overlay-dock-icon {
      transform: scale(1.13);
    }
    .postReading-overlay-dock-icon img {
      object-fit: contain;
      filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.38));
    }
    .postReading-overlay-dock-badge {
      position: absolute;
      right: -4px;
      bottom: -5px;
      max-width: 52px;
      overflow: hidden;
      padding: 2px 5px;
      border: 1px solid rgba(0, 0, 0, 0.4);
      border-radius: 999px;
      background: #f8d35d;
      color: #191713;
      font: 900 10px/1.2 inherit;
      text-overflow: ellipsis;
      white-space: nowrap;
      pointer-events: none;
    }
    .postReading-overlay-dock-gear {
      overflow: visible;
      color: var(--postReading-dock-gear-text);
      font-size: 0;
    }
    .postReading-overlay-dock-gear::before {
      content: "";
      position: absolute;
      inset: 5px;
      border: 2px solid var(--postReading-dock-gear-ring);
      border-radius: 999px;
      background:
        radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.74), transparent 16px),
        var(--postReading-dock-gear-bg);
      box-shadow:
        inset 1px 1px 0 rgba(255, 255, 255, 0.32),
        0 2px 7px rgba(0, 0, 0, 0.22);
    }
    .postReading-overlay-dock-gear-icon {
      position: relative;
      z-index: 1;
      display: grid;
      width: 35px;
      height: 35px;
      place-items: center;
      font-family: "Segoe UI Symbol", "Apple Symbols", var(--postReading-font-ui, system-ui, sans-serif);
      font-size: 30px;
      font-weight: 900;
      line-height: 1;
      pointer-events: none;
      text-shadow:
        0 1px 0 rgba(255, 255, 255, 0.36),
        0 2px 4px rgba(0, 0, 0, 0.32);
      transform: rotate(0deg) scale(1);
      transition: transform 180ms ease;
    }
    .postReading-overlay-dock-gear[data-hovered="true"] .postReading-overlay-dock-gear-icon {
      transform: rotate(22deg) scale(1.08);
    }
    .postReading-overlay-dock-settings {
      position: absolute;
      top: 0;
      display: grid;
      gap: 8px;
      width: 150px;
      padding: 10px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 8px;
      background: rgba(14, 15, 19, 0.94);
      color: #fff4cf;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.34);
    }
    #${ROOT_ID}[data-side="left"] .postReading-overlay-dock-settings { left: 70px; }
    #${ROOT_ID}[data-side="right"] .postReading-overlay-dock-settings { right: 70px; }
    .postReading-overlay-dock-settings strong {
      font-size: 12px;
      line-height: 1.2;
    }
    .postReading-overlay-dock-settings button {
      min-height: 28px;
      border: 1px solid rgba(250, 220, 130, 0.24);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      color: #fff4cf;
      cursor: pointer;
      font: 700 11px/1 inherit;
    }
    .postReading-overlay-dock-segment {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px;
    }
    .postReading-overlay-dock-segment button[data-active="true"] {
      background: rgba(250, 220, 130, 0.22);
      border-color: rgba(250, 220, 130, 0.48);
    }
    @keyframes postReading-dock-wiggle {
      from { transform: rotate(-1.3deg); }
      to { transform: rotate(1.3deg); }
    }
    @media (max-width: 720px) {
      #${ROOT_ID} {
        --postReading-dock-top: 8px;
        --postReading-dock-bottom-clearance: 96px;
      }
    }
  `;
  document.documentElement.appendChild(style);
}

export function getOverlayDock(): DockApi {
  const host = window as unknown as Record<string, DockApi | undefined>;
  host[globalKey] ||= createDockApi();
  return host[globalKey];
}
