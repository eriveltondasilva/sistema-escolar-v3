// client/utils/alpine.ts
export function startAlpine() {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/alpinejs@3.15.12/dist/cdn.min.js";
  document.head.appendChild(script);
}
