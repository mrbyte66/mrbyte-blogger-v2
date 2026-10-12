export function authMotionDuration(duration: number) {
  return document.documentElement.dataset.motion === "off" ||
    (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) ? 0 : duration;
}

export function isAccountRoute(path: string) {
  return ["/hesap", "/studio", "/preview", "/kaydedilenler"].some(route => path === route || path.startsWith(route + "/"));
}
