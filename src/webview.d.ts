// WebView2 puts `chrome.webview` on the window. Declared here so code that calls window.chrome?.webview?.postMessage(...) type-checks.
export {}

declare global {
  interface Window {
    chrome?: {
      webview?: {
        postMessage(message: unknown): void
      }
    }
  }
}
