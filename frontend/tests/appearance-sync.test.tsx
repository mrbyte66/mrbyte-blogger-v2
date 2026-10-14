import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../components/auth/AuthProvider";
import { AppearanceSync } from "../components/auth/AppearanceSync";
import { SitePreferences, ThemeToggle } from "../components/SitePreferences";
import { fakeBackend, settle } from "./support/fake-backend";

const app = () => render(<SitePreferences><AuthProvider><AppearanceSync /><ThemeToggle /></AuthProvider></SitePreferences>);
beforeEach(() => {
  localStorage.clear();
  for (const key of ["theme", "tone", "studioView"]) delete document.documentElement.dataset[key];
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("appearance that follows the account", () => {
  it("signs in with the account's own colour mode and Studio view", async () => {
    localStorage.setItem("satir:theme", "dark");
    fakeBackend({ signedIn: { appearance: { colorMode: "reading", motion: null, studioView: "kontakt" } } });
    app(); await act(settle);
    expect(document.documentElement.dataset.tone).toBe("reading");
    expect(localStorage.getItem("satir:theme")).toBe("reading");
    expect(document.documentElement.dataset.studioView).toBe("kontakt");
    expect(screen.getByRole("button", { name: "Okuma modu" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps the newest choice on the account's own browser and brings the account up to date", async () => {
    localStorage.setItem("satir:theme", "dark");
    localStorage.setItem("satir:appearance-account", "11111111-1111-4111-8111-111111111111");
    const backend = fakeBackend({ signedIn: { appearance: { colorMode: "light", motion: null, studioView: null } } });
    app(); await act(settle);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(backend.state.profile?.appearance.colorMode).toBe("dark");
  });

  it("keeps this browser's choices for an account that has none and sends later changes to it", async () => {
    localStorage.setItem("satir:theme", "dark");
    const backend = fakeBackend({ signedIn: {} });
    app(); await act(settle);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(backend.state.profile?.appearance.colorMode).toBe("dark");
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Okuma modu" }));
    fireEvent.click(screen.getByRole("button", { name: "Gündüz modu" }));
    await act(async () => { vi.advanceTimersByTime(500); });
    vi.useRealTimers(); await act(settle);
    const sent = backend.state.calls.filter((call) => call.method === "PUT" && call.path === "/me/appearance");
    expect(sent.at(-1)?.body).toMatchObject({ colorMode: "light" });
    expect(sent.length).toBe(2);
  });

  it("sends a pending change when the page is left", async () => {
    const backend = fakeBackend({ signedIn: {} });
    app(); await act(settle);
    fireEvent.click(screen.getByRole("button", { name: "Gece modu" }));
    act(() => { window.dispatchEvent(new Event("pagehide")); });
    await act(settle);
    expect(backend.state.profile?.appearance.colorMode).toBe("dark");
  });

  it("does not talk to the server for a visitor", async () => {
    const backend = fakeBackend({ signedIn: null });
    app(); await act(settle);
    fireEvent.click(screen.getByRole("button", { name: "Gece modu" }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 600)); });
    expect(backend.state.calls.some((call) => call.path === "/me/appearance")).toBe(false);
  });
});
