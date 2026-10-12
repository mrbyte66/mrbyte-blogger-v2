import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../components/auth/AuthProvider";
import { AuthNavigation } from "../components/auth/AuthNavigation";
import { AuthCard } from "../components/auth/AuthCard";
import { AccountPage } from "../components/auth/AccountPage";
import { fakeBackend, settle } from "./support/fake-backend";

const routing = vi.hoisted(() => ({ path: "/hesap", replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => routing.path, useRouter: () => routing }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); routing.replace.mockClear(); routing.refresh.mockClear(); });

function Logout() { const auth = useAuth(); return <><button onClick={() => void auth.signOut()}>Çıkış</button><button onClick={() => auth.openAuth()}>Pencereyi aç</button><span>{auth.session ? "Üye" : "Misafir"}</span></>; }

describe("membership usability", () => {
  it("blocks paste and drop only in password confirmation, while retaining typed input", async () => {
    fakeBackend(); render(<AuthProvider><AuthCard initial="register" /></AuthProvider>); await act(settle);
    const confirmation = screen.getByLabelText("Şifre tekrarı", { exact: true });
    expect(fireEvent.paste(confirmation, { clipboardData: { getData: () => "pasted-password" } })).toBe(false);
    expect(fireEvent.drop(confirmation)).toBe(false);
    expect(fireEvent.paste(screen.getByLabelText("Şifre", { exact: true }))).toBe(true);
    fireEvent.change(confirmation, { target: { value: "typed-password" } });
    expect((confirmation as HTMLInputElement).value).toBe("typed-password");
  });

  it("keeps account deletion inside security details instead of every account section", async () => {
    fakeBackend({ signedIn: { email: "okur@example.test" } }); render(<AuthProvider><AccountPage /></AuthProvider>); await act(settle);
    expect(screen.queryByRole("button", { name: "Hesabı sil" })).toBeNull();
    expect(screen.getByRole("navigation", { name: "Hesap bölümleri" }).textContent).not.toContain("Hesabı Sil");
    fireEvent.click(screen.getByRole("button", { name: "Güvenlik" }));
    expect(document.querySelector("details.account-delete")?.hasAttribute("open")).toBe(false);

    fireEvent.click(screen.getByText("Diğer hesap işlemleri"));
    expect(screen.getByRole("button", { name: "Hesabı sil" })).toBeTruthy();
  });

  it("saves the reader subscription without changing the author notification preference", async () => {
    const backend = fakeBackend({ signedIn: { email: "okur@example.test" } });
    render(<AuthProvider><AccountPage /></AuthProvider>); await act(settle);
    fireEvent.click(screen.getByRole("button", { name: "Bildirimler" }));
    expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(true);
    await act(async () => { fireEvent.click(screen.getByRole("switch")); await settle(); });
    expect(backend.state.profile?.preferences.publicationSubscription).toBe(false);
    expect(backend.state.profile?.preferences.publicationEmail).toBe(true);
    expect(backend.state.calls.find(c => c.path === "/me/preferences")?.body).toMatchObject({ publicationSubscription: false });
  });

  it("dismisses the successful login dialog with the closing animation", async () => {
    const backend = fakeBackend(); backend.addAccount({ email: "alice@example.com" }); render(<AuthProvider><Logout /></AuthProvider>); await act(settle);
    fireEvent.click(screen.getByRole("button", { name: "Pencereyi aç" }));
    fireEvent.change(screen.getByLabelText("E-posta veya kullanıcı adı"), { target: { value: "alice@example.com" } });
    fireEvent.change(screen.getByLabelText("Şifre", { exact: true }), { target: { value: "dogru-parola-123" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Giriş yap" })); await settle(); });
    expect(screen.getByRole("dialog").className).toContain("is-closing");
    expect(screen.getByText("Hoş geldin.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 2000 });
    expect(screen.getByText("Üye")).toBeTruthy();
  });

  it.each(["/hesap", "/studio/hesap", "/kaydedilenler"])("returns home after successful logout from %s", async path => {
    routing.path = path; fakeBackend({ signedIn: { email: "okur@example.test" } });
    render(<AuthProvider><AuthNavigation /><Logout /></AuthProvider>); await act(settle);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Çıkış" })); await settle(); });
    expect(routing.replace).toHaveBeenCalledWith("/"); expect(screen.getByText("Misafir")).toBeTruthy();
  });

  it("leaves the reader on the same public article after logout", async () => {
    routing.path = "/yazilar/yazi"; fakeBackend({ signedIn: { email: "okur@example.test" } });
    render(<AuthProvider><AuthNavigation /><Logout /></AuthProvider>); await act(settle);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Çıkış" })); await settle(); });
    expect(routing.replace).not.toHaveBeenCalled(); expect(routing.refresh).toHaveBeenCalled();
  });

  it("retains the real session when the logout request fails", async () => {
    const backend = fakeBackend({ signedIn: { email: "okur@example.test" } });
    const fetch = backend.fetchMock.getMockImplementation()!;
    backend.fetchMock.mockImplementation((input, init) => String(input).endsWith("/auth/logout") ? Promise.reject(new Error("offline")) : fetch(input, init));
    render(<AuthProvider><Logout /></AuthProvider>); await act(settle);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Çıkış" })); await settle(); });
    await waitFor(() => expect(screen.getByText("Üye")).toBeTruthy());
    expect(backend.state.profile).not.toBeNull();
    expect(screen.queryByText("Görüşmek üzere.")).toBeNull();
  });
});
