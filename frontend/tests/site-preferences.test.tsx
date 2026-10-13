import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { SitePreferences, ThemeToggle } from "../components/SitePreferences";

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.motion;
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); delete document.documentElement.dataset.themeTransition; });

describe("shared site appearance", () => {
  it("keeps a chosen theme when navigating to a fresh page", () => {
    const first = render(<SitePreferences><ThemeToggle /></SitePreferences>);
    fireEvent.click(screen.getByRole("button", { name: "Koyu temaya geç" }));
    expect(localStorage.getItem("satir:theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    first.unmount();
    render(<SitePreferences><ThemeToggle /></SitePreferences>);
    expect(screen.getByRole("button", { name: "Açık temaya geç" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Açık temaya geç" }));
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  it("synchronizes a theme change made by another tab or embedded preview", () => {
    render(<SitePreferences><ThemeToggle /></SitePreferences>);
    localStorage.setItem("satir:theme", "dark");
    fireEvent(window, new StorageEvent("storage", { key: "satir:theme", newValue: "dark" }));
    expect(screen.getByRole("button", { name: "Açık temaya geç" })).toBeTruthy();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
  it("disables site transitions when reduced motion is requested", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<SitePreferences><ThemeToggle /></SitePreferences>);
    expect(document.documentElement.dataset.motion).toBe("off");
  });
  it("retains the latest choice during repeated lighting changes and cleans up after the last transition", async () => {
    const finishes: (() => void)[] = [];
    const skips: ReturnType<typeof vi.fn>[] = [];
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: vi.fn((apply: () => void) => {
      apply();
      const finished = new Promise<void>(resolve => finishes.push(resolve));
      const skipTransition = vi.fn(); skips.push(skipTransition);
      return { finished, skipTransition };
    }) });
    const view = render(<SitePreferences><ThemeToggle /></SitePreferences>);
    fireEvent.click(screen.getByRole("button", { name: "Koyu temaya geç" }));
    fireEvent.click(screen.getByRole("button", { name: "Açık temaya geç" }));
    expect(skips[0]).toHaveBeenCalledOnce();
    expect(localStorage.getItem("satir:theme")).toBe("light");
    await act(async () => { finishes[0](); });
    expect(document.documentElement.dataset.themeTransition).toBe("on");
    await act(async () => { finishes[1](); });
    expect(document.documentElement.dataset.themeTransition).toBeUndefined();
    view.unmount(); Reflect.deleteProperty(document, "startViewTransition");
  });
  it("changes the theme immediately without starting a snapshot when motion is disabled", () => {
    localStorage.setItem("satir:motion", "off");
    const start = vi.fn();
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: start });
    render(<SitePreferences><ThemeToggle /></SitePreferences>);
    fireEvent.click(screen.getByRole("button", { name: "Koyu temaya geç" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(start).not.toHaveBeenCalled();
    Reflect.deleteProperty(document, "startViewTransition");
  });

});
