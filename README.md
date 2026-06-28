<p align="center">
  <img src="public/post-reading/post-reading-logo-pond-halftone.png" alt="Post-reading" width="700">
</p>

# Post-reading

Browser extension for read-aloud controls on X/Twitter posts.

> **From milXdy:** Post-reading is a standalone release of the Post-reading
> feature from the larger milXdy app platform. It follows the upstream milXdy
> feature version, so standalone versions may skip numbers. This code is
> released under the [Viral Public License](LICENSE).

## Install from GitHub

The easiest install path is the latest browser zip from
[Post-reading Releases](https://github.com/bonklek/post-reading/releases).

1. Open [Post-reading Releases](https://github.com/bonklek/post-reading/releases).
2. Download `post-reading-chromium-vX.Y.Z.zip` for Chrome.
3. Extract the zip file.
4. Open `chrome://extensions`.
5. Turn on **Developer mode**.
6. Click **Load unpacked**.
7. Select the extracted `post-reading-chromium` folder.

Do not use GitHub's **Code > Download ZIP** button for installation. That
downloads the source repository, not the ready-to-load extension package.

Release zips are built from these output folders:

| Browser | Release zip | Extension loader |
| --- | --- | --- |
| Chrome | `post-reading-chromium-vX.Y.Z.zip` | `chrome://extensions` |
| Microsoft Edge | `post-reading-edge-vX.Y.Z.zip` | `edge://extensions` |
| Brave | `post-reading-brave-vX.Y.Z.zip` | `brave://extensions` |
| Vivaldi | `post-reading-vivaldi-vX.Y.Z.zip` | `vivaldi://extensions` |
| Opera | `post-reading-opera-vX.Y.Z.zip` | `opera://extensions` |
| Firefox | `post-reading-firefox-vX.Y.Z.zip` | `about:debugging#/runtime/this-firefox` |

For Firefox, extract the zip, open the Firefox runtime debugging page, choose
**Load Temporary Add-on**, and select the extracted folder's `manifest.json`.

## Build from source

```powershell
pnpm install
pnpm run build
```

Load the matching unpacked extension folder:

| Browser | Build output | Extension loader |
| --- | --- | --- |
| Chrome | `dist/post-reading-chromium` | `chrome://extensions` |
| Microsoft Edge | `dist/post-reading-edge` | `edge://extensions` |
| Brave | `dist/post-reading-brave` | `brave://extensions` |
| Vivaldi | `dist/post-reading-vivaldi` | `vivaldi://extensions` |
| Opera | `dist/post-reading-opera` | `opera://extensions` |
| Firefox | `dist/post-reading-firefox/manifest.json` | `about:debugging#/runtime/this-firefox` |

Targeted builds are also available:

```powershell
pnpm run build:chromium
pnpm run build:edge
pnpm run build:brave
pnpm run build:vivaldi
pnpm run build:opera
pnpm run build:firefox
```

## Releases

This standalone package follows the same version as the source Post-reading
feature in the larger milXdy app platform it was extracted from. Versions may
skip numbers when milXdy changes.

To publish installable GitHub zips:

```powershell
pnpm install
pnpm run typecheck
pnpm run build
git tag v0.3.6
git push origin v0.3.6
```

Pushing a `v*` tag runs the release workflow and attaches browser-specific zip
files to the GitHub Release.

## Feature overview

Post-reading adds read-aloud controls to X/Twitter posts on `x.com` and
`twitter.com`.

- A speaker button is inserted into each detected post. The button can be placed
  near the top controls, in the action row, or chosen automatically.
- Clicking the button extracts the readable post text and opens the floating
  Post-reading player.
- The player supports play/pause, stop, next/previous post, next/previous
  paragraph, OCR skip, and an in-page settings panel.
- Spoken text can include the main post text, quoted posts, link preview text,
  image alt text, poll options, hyperlinks, and optional OCR text from attached
  images.
- The active post can be highlighted, and the body text can be highlighted by
  word or with smooth progress when the active TTS engine provides usable timing.
- Autoplay can continue through visible posts or scroll forward to find the next
  post.
- Promoted posts are skipped by default during adjacent-post navigation.
- The extension popup provides quick controls for autoplay, autoplay mode,
  speed, volume, and the most common keyboard shortcuts.

## Startup flow

The extension is built from these browser entrypoints:

- `src/standalone/post-reading/content.ts` is the content-script adapter. It
  creates a small app context for the extracted Post-reading implementation, sets
  the default performance mode to `balanced`, boots Post-reading, and subscribes
  it to tweet surfaces from `src/shared/twitterScanner.ts`.
- `src/features/post-reading/content.ts` is the main content implementation. On
  boot it injects styles, loads settings from `chrome.storage.sync`, creates the
  speech controller, creates the floating player, observes settings
  changes, installs scroll and keyboard listeners, and schedules the first tweet
  scan.
- `src/standalone/post-reading/background.ts` imports the Post-reading background
  handlers and starts the shared message router.
- `src/features/post-reading/background.ts` handles Post-reading fetch requests
  from the content script. It performs quote/syndication fetches in the extension
  background context and routes them through the shared network queue.
- `src/features/post-reading/popup.ts` powers the extension action popup.
- `src/features/post-reading/ocrHost.ts` runs inside `public/ocr.html` when OCR is
  needed.

At runtime, `twitterScanner` watches the page with a `MutationObserver`, scroll
listener, and visibility listener. Each detected tweet surface is passed to
`onSurface()`, which batches pending tweets and inserts read buttons according
to the current performance policy.

When the page unloads, the adapter aborts the lifecycle signal and disposes
subscriptions, listeners, and registered cleanup callbacks.

## Reading pipeline

When a user starts playback:

1. Post-reading optionally expands visible `"Show more"` text.
2. `extractReadablePost()` reads the post body and selected metadata according
   to settings.
3. If configured, quote text is enriched from the embedded quote preview,
   syndication endpoint, oEmbed, or fetched page HTML.
4. If OCR is enabled, attached images are sent to the hidden OCR host iframe.
   OCR progress appears in the player, and the user can skip the active OCR
   request.
5. `formatReadablePost()` creates the final spoken text.
6. `SpeechController` sends the text to either browser Web Speech or the custom
   HTTP TTS engine.
7. Boundary events, custom timing data, or estimated timing drive the active
   body-text highlight.

## Settings

Settings are stored in `chrome.storage.sync` and normalized by
`src/features/post-reading/storage.ts`. Voice boundary test results are stored in
`chrome.storage.local` under `voiceBoundarySupportV2`.

| Setting | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Master enable flag used by the integrated implementation. In this build, the adapter always boots Post-reading. |
| `speed` | `1` | Speech rate. Normalized to `0.5` through `10`. |
| `volume` | `1` | Speech volume. Normalized to `0` through `1`. |
| `voiceURI` | `null` | Explicit Web Speech voice. `null` lets auto voice selection choose. |
| `autoVoice` | `true` | Prefer known English voices when no explicit voice is selected. |
| `ttsEngine` | `web-speech` | TTS backend: browser Web Speech or custom HTTP. |
| `customTtsEndpoint` | `null` | HTTP endpoint for custom TTS POST requests. |
| `customTtsTimingMode` | `engine` | Use custom endpoint timing boundaries when available, or turn them off. |
| `autoplayNext` | `true` | Continue to the next post after speech completes. |
| `autoplayMode` | `autoscroll` | Next-post strategy: visible posts only, or autoscroll forward. |
| `skipPromotedPosts` | `true` | Skip promoted posts during next/previous navigation. |
| `endOfTweetDing` | `true` | Play a short sound after a post finishes. |
| `includeQuotes` | `true` | Include quoted post text. |
| `fetchFullQuotes` | `true` | Fetch fuller quote text instead of relying only on visible preview text. |
| `fullQuoteDisplay` | `scroll` | Quote preview rendering: hidden, expanded inline, or scrollable preview. |
| `includeHyperlinks` | `false` | Include raw hyperlink text in the spoken output. |
| `includeImageAltText` | `true` | Read available image alt text. |
| `includeImageOcr` | `true` | Run OCR on attached images and include recognized text. |
| `includeLinkPreviews` | `true` | Include link card preview text. |
| `expandShowMore` | `true` | Click visible `"Show more"` controls before extraction. |
| `activeTweetHighlight` | `true` | Highlight the currently active post. |
| `bodyHighlightMode` | `smooth` | Body text highlight mode: off, word, or smooth. |
| `playerPosition` | `top-right` | Floating player corner. |
| `buttonPlacement` | `auto` | Read button placement: auto, top, or action row. |
| `useHandles` | `false` | Reserved setting for handle-oriented author labels. |
| `keyNextTweet` | `Ctrl+Alt+ArrowDown` | Keyboard shortcut for next post or moving from quote back to main text. |
| `keyPreviousTweet` | `Ctrl+Alt+ArrowUp` | Keyboard shortcut for previous post. |
| `keyNextChunk` | `Ctrl+Alt+ArrowRight` | Keyboard shortcut for next paragraph/chunk. |
| `keyPreviousChunk` | `Ctrl+Alt+ArrowLeft` | Keyboard shortcut for previous paragraph/chunk. |
| `keySkipOcr` | `Ctrl+Alt+S` | Keyboard shortcut to skip active OCR. |
| `keyPlayPause` | <code>Ctrl+Alt+\</code> | Keyboard shortcut for play/pause. |

The in-page player exposes the complete settings set. The extension popup is a
compact shell for quick changes to autoplay, mode, speed, volume, next post,
previous post, and play/pause.

## Permissions and privacy

The extension manifest requests:

- `storage` for user settings and local voice-boundary test results.
- `unlimitedStorage` for the bundled OCR runtime and language data used by
  Tesseract in extension storage/cache contexts.
- `https://x.com/*` and `https://twitter.com/*` for the content script and
  fetched post HTML.
- `https://publish.twitter.com/*` and
  `https://cdn.syndication.twimg.com/*` for optional quoted-post enrichment.
- `https://pbs.twimg.com/*` for optional image OCR on X/Twitter-hosted images.
- `http://localhost/*` and `http://127.0.0.1/*` for an optional local custom
  TTS endpoint configured by the user.

Post-reading stores settings in browser extension storage. It does not ship any
service credentials, and the background fetch bridge only accepts the X/Twitter
quote-enrichment hosts listed above.

## TTS engines

### Browser Web Speech

The default engine uses `window.speechSynthesis`. It supports browser voices,
pause/resume, and boundary events when the selected voice reports them.
Post-reading can test voices for boundary support and stores the result locally so
the player can rank voices for highlighting.

### Custom HTTP

The custom engine sends a POST request to `customTtsEndpoint`:

```json
{
  "text": "Text to speak",
  "rate": 1,
  "volume": 1,
  "voiceURI": null
}
```

The endpoint must return JSON with either `audioUrl` or `audioBase64`. It may
also return `audioContentType` and `boundaries`. Boundaries are sorted by
`elapsedTime` and can drive synced highlighting when `customTtsTimingMode` is
`engine`.

```json
{
  "audioUrl": "https://example.test/speech.mp3",
  "boundaries": [
    { "charIndex": 0, "charLength": 4, "elapsedTime": 0.1 }
  ]
}
```

## OCR

OCR is enabled by default via `includeImageOcr`. The content script creates a
hidden iframe for `ocr.html`, which loads `ocrHost.js`. The build copies
Tesseract worker, core, and English language data into each target output's
`ocr` directory. OCR results are cached per image URL for the current page
session.

OCR requests have a 15 second host-load timeout and a 45 second recognition
timeout. The player shows progress and exposes a skip control.

## Build output

The build uses the extracted Post-reading implementation:

- content behavior: `src/features/post-reading/content.ts`
- background fetch bridge: `src/features/post-reading/background.ts`
- popup controls: `src/features/post-reading/popup.ts`
- OCR host: `src/features/post-reading/ocrHost.ts`

The build script writes a manifest, copies the Post-reading assets, copies the
Tesseract OCR runtime files, and bundles only the Post-reading entries.

This repository intentionally contains only these extracted paths:

- `src/features/post-reading`
- `src/shared/appPlatform.ts`
- `src/shared/backgroundRouter.ts`
- `src/shared/disposables.ts`
- `src/shared/extensionRuntime.ts`
- `src/shared/performanceDiagnostics.ts`
- `src/shared/performanceMode.ts`
- `src/shared/twitterScanner.ts`
- `src/standalone/post-reading`
- `public/post-reading`
- `public/post-reading-standalone`
- `public/ocr.html`
- `scripts/build-post-reading.mjs`

The extraction intentionally keeps only the shared helpers Post-reading still imports.

## License

Post-reading is released under the [Viral Public License](LICENSE). The full
license text is included in this repository.

<p align="center">
  <strong>Extracted from the milXdy app platform</strong>
</p>

<p align="center">
  <img src="public/post-reading/milxdy-home-logo-wide.png" alt="milXdy" width="700">
</p>
