export function injectStyles(): void {
  if (document.getElementById("post-reading-style")) return;
  const style = document.createElement("style");
  style.id = "post-reading-style";
  style.textContent = `
    .post-reading-button {
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: rgb(83, 100, 113);
      background: transparent;
      cursor: pointer;
      padding: 0;
      flex: 0 0 auto;
      position: relative;
      z-index: 2;
    }
    .post-reading-button-slot {
      position: relative;
      display: inline-block;
      width: 0;
      height: 0;
      flex: 0 0 0;
      overflow: visible;
      vertical-align: top;
    }
    .post-reading-button-slot .post-reading-button {
      position: absolute;
      left: 4px;
      top: 0;
      transform: translateY(-50%);
    }
    .post-reading-button:hover,
    .post-reading-button[aria-pressed="true"] {
      color: rgb(199, 102, 147);
      background: rgba(199, 102, 147, 0.12);
    }
    .post-reading-button svg {
      width: 18px;
      height: 18px;
      pointer-events: none;
    }
    .post-reading-player {
      position: fixed;
      top: 12px;
      right: 16px;
      z-index: 2147483646;
      display: block;
      padding: 6px;
      border: 1px solid rgba(199, 102, 147, 0.42);
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255, 252, 254, 0.96), rgba(255, 246, 250, 0.94));
      color: rgb(15, 20, 25);
      box-shadow: 0 4px 18px rgba(199, 102, 147, 0.18), 0 1px 0 rgba(255, 255, 255, 0.8) inset;
      font: 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      backdrop-filter: blur(12px);
    }
    .post-reading-shell {
      display: grid;
      gap: 6px;
    }
    .post-reading-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .post-reading-player[data-position="top-right"] { top: 12px; right: 16px; bottom: auto; left: auto; }
    .post-reading-player[data-position="bottom-right"] { top: auto; right: 16px; bottom: 16px; left: auto; }
    .post-reading-player[data-position="top-left"] { top: 12px; right: auto; bottom: auto; left: 16px; }
    .post-reading-player[data-position="bottom-left"] { top: auto; right: auto; bottom: 16px; left: 16px; }
    .post-reading-player[data-visible="false"] {
      display: none;
    }
    .post-reading-control {
      width: 30px;
      height: 30px;
      border: 0;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: inherit;
      background: transparent;
      cursor: pointer;
      padding: 0;
    }
    .post-reading-control:hover {
      color: rgb(199, 102, 147);
      background: rgba(199, 102, 147, 0.12);
    }
    .post-reading-control svg {
      width: 16px;
      height: 16px;
      pointer-events: none;
    }
    .post-reading-close {
      margin-left: 2px;
      color: rgb(122, 83, 104);
    }
    .post-reading-close:hover {
      color: rgb(211, 67, 120);
      background: rgba(211, 67, 120, 0.14);
    }
    .post-reading-title {
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 4px;
      color: rgb(122, 83, 104);
    }
    .post-reading-ocr {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 220px;
      padding: 4px 6px 2px;
      color: rgb(122, 83, 104);
      font-size: 12px;
    }
    .post-reading-ocr-details {
      display: grid;
      gap: 4px;
      min-width: 0;
      flex: 1 1 auto;
    }
    .post-reading-ocr-bar {
      --post-reading-ocr-progress: 0%;
      height: 4px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(199, 102, 147, 0.16);
    }
    .post-reading-ocr-bar span {
      display: block;
      width: var(--post-reading-ocr-progress);
      height: 100%;
      border-radius: inherit;
      background: rgb(199, 102, 147);
      transition: width 160ms linear;
    }
    .post-reading-ocr[hidden] {
      display: none;
    }
    .post-reading-ocr-skip {
      padding: 4px 7px;
      white-space: nowrap;
    }
    .post-reading-settings {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 260px;
      padding: 12px;
      border: 1px solid rgba(199, 102, 147, 0.38);
      border-radius: 8px;
      background: linear-gradient(180deg, rgba(255, 252, 254, 0.99), rgba(255, 247, 251, 0.98));
      box-shadow: 0 10px 30px rgba(82, 39, 62, 0.18);
      display: grid;
      gap: 10px;
    }
    .post-reading-settings[hidden] {
      display: none;
    }
    .post-reading-settings label {
      display: grid;
      gap: 4px;
      color: rgb(83, 100, 113);
      font-size: 12px;
    }
    .post-reading-tabs {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .post-reading-tabs button {
      border: 1px solid rgba(199, 102, 147, 0.25);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.62);
      color: rgb(122, 83, 104);
      cursor: pointer;
      font: inherit;
      font-size: 11px;
      padding: 5px 8px;
      white-space: nowrap;
    }
    .post-reading-tabs button[data-active="true"] {
      background: rgba(199, 102, 147, 0.16);
      color: rgb(159, 62, 108);
      border-color: rgba(199, 102, 147, 0.45);
    }
    .post-reading-hint {
      color: rgb(122, 83, 104);
      font-size: 12px;
    }
    .post-reading-settings select,
    .post-reading-settings input[type="number"],
    .post-reading-settings input[type="range"] {
      width: 100%;
      box-sizing: border-box;
    }
    .post-reading-settings select,
    .post-reading-settings input[type="number"] {
      border: 1px solid rgba(199, 102, 147, 0.35);
      border-radius: 6px;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.82);
      color: inherit;
    }
    .post-reading-secondary {
      border: 1px solid rgba(199, 102, 147, 0.35);
      border-radius: 6px;
      padding: 7px 9px;
      background: rgba(199, 102, 147, 0.1);
      color: rgb(122, 83, 104);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
    }
    .post-reading-secondary:disabled {
      cursor: default;
      opacity: 0.65;
    }
    .post-reading-checkbox {
      grid-template-columns: 18px 1fr;
      align-items: center;
    }
    .post-reading-checkbox input {
      margin: 0;
    }
    article[data-post-reading-active="true"][data-post-reading-active-background="true"] {
      box-shadow: inset 3px 0 0 rgba(199, 102, 147, 0.9);
      background: linear-gradient(90deg, rgba(199, 102, 147, 0.08), transparent 42%);
    }
    article[data-post-reading-active="true"][data-post-reading-active-background="true"][data-post-reading-effect="highlight"] {
      outline-color: rgba(199, 102, 147, 0.55) !important;
      box-shadow:
        inset 4px 0 0 rgba(199, 102, 147, 0.85),
        0 2px 6px rgba(184, 134, 11, 0.12),
        0 6px 20px rgba(212, 175, 55, 0.18),
        0 0 0 1px rgba(199, 102, 147, 0.18),
        inset 0 1px 0 rgba(255, 223, 100, 0.2) !important;
      background:
        linear-gradient(90deg, rgba(199, 102, 147, 0.11), rgba(199, 102, 147, 0) 38%),
        linear-gradient(180deg, rgba(255, 253, 244, 1) 0%, rgba(255, 255, 252, 1) 100%) !important;
    }
    [data-post-reading-preview-hidden="true"] {
      display: none;
    }
    .post-reading-full-quote {
      margin-top: 0;
      padding: 11px 12px;
      border: 1px solid rgb(207, 217, 222);
      border-radius: 12px;
      background: transparent;
      color: rgb(15, 20, 25);
      font: inherit;
      font-family: inherit;
      font-size: 15px;
      letter-spacing: inherit;
      line-height: 20px;
      cursor: text;
    }
    .post-reading-full-quote-label {
      margin-bottom: 2px;
      color: rgb(83, 100, 113);
      font: inherit;
      font-size: 13px;
      line-height: 16px;
      font-weight: 400;
    }
    .post-reading-full-quote-body {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      color: rgb(15, 20, 25);
      font: inherit;
      font-size: 15px;
      line-height: 20px;
    }
    .post-reading-full-quote-paragraph {
      margin: 0 0 12px;
      white-space: pre-wrap;
    }
    .post-reading-full-quote-paragraph[data-tight="true"] {
      margin-bottom: 4px;
    }
    .post-reading-full-quote-paragraph:last-child {
      margin-bottom: 0;
    }
    .post-reading-full-quote-list {
      margin: 0 0 12px;
      padding-left: 0;
      list-style: none;
    }
    .post-reading-full-quote-list:last-child {
      margin-bottom: 0;
    }
    .post-reading-full-quote-list li {
      margin: 0 0 4px;
      padding-left: 0;
    }
    .post-reading-full-quote-list li:last-child {
      margin-bottom: 0;
    }
    .post-reading-full-quote[data-mode="scroll"] .post-reading-full-quote-body {
      max-height: 112px;
      min-height: 68px;
      overflow-y: auto;
      padding-right: 6px;
      scrollbar-width: thin;
    }
    [data-post-reading-word="true"][data-post-reading-current-word="true"] {
      background: rgba(199, 102, 147, 0.18);
      border-radius: 4px;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
      transition: background 80ms linear;
    }
    [data-post-reading-smooth-word="true"] {
      --post-reading-fill: 0%;
      --post-reading-fill-duration: 160ms;
      white-space: pre-wrap;
      background:
        linear-gradient(90deg, rgba(199, 102, 147, 0.24) var(--post-reading-fill), transparent var(--post-reading-fill));
      border-radius: 4px;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
      transition: background var(--post-reading-fill-duration) linear;
    }
    [data-post-reading-smooth-word="true"][data-post-reading-smooth-filled="true"] {
      --post-reading-fill: 100%;
    }
    [data-post-reading-smooth-word="true"][data-post-reading-token-kind="space"] {
      border-radius: 0;
    }
    @media (prefers-color-scheme: dark) {
      .post-reading-player,
      .post-reading-settings {
        background: linear-gradient(180deg, rgba(21, 18, 24, 0.94), rgba(34, 24, 31, 0.92));
        color: rgb(231, 233, 234);
        border-color: rgba(220, 133, 174, 0.42);
      }
      .post-reading-control:hover {
        background: rgba(239, 243, 244, 0.1);
      }
      .post-reading-full-quote {
        border-color: rgb(47, 51, 54);
        color: rgb(231, 233, 234);
      }
      .post-reading-full-quote-label {
        color: rgb(113, 118, 123);
      }
      .post-reading-full-quote-body {
        color: rgb(231, 233, 234);
      }
      article[data-post-reading-active="true"][data-post-reading-active-background="true"][data-post-reading-effect="highlight"] {
        background:
          linear-gradient(90deg, rgba(220, 133, 174, 0.13), rgba(220, 133, 174, 0) 38%),
          linear-gradient(180deg, rgb(32, 26, 14) 0%, rgb(24, 20, 10) 100%) !important;
        box-shadow:
          inset 4px 0 0 rgba(220, 133, 174, 0.78),
          0 2px 8px rgba(0, 0, 0, 0.4),
          0 4px 16px rgba(120, 100, 30, 0.08),
          0 0 0 1px rgba(220, 133, 174, 0.16),
          inset 0 1px 0 rgba(160, 135, 50, 0.08) !important;
      }
    }
  `;
  document.head.appendChild(style);
}
