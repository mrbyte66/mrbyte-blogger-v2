import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../components/auth/AuthProvider";
import { ServerStorage } from "../components/ServerStorage";
import { fakeBackend } from "./support/fake-backend";

const settle = async () => { for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0)); };

describe("server disk space in the footer", () => {
  it("is shown to the owner", async () => {
    fakeBackend({ signedIn: { email: "owner@example.com", name: "Sahip", role: "owner" } });
    render(<AuthProvider><ServerStorage /></AuthProvider>);
    await act(settle);
    expect(screen.getByText("Sunucu: 185 GB boş / 193 GB")).toBeTruthy();
  });
  it.each([["a member", { email: "uye@example.com", role: "member" as const }], ["a visitor", null]])("is neither requested nor shown for %s", async (_, signedIn) => {
    const backend = fakeBackend({ signedIn });
    const { container } = render(<AuthProvider><ServerStorage /></AuthProvider>);
    await act(settle);
    expect(container.textContent).toBe("");
    expect(backend.state.calls.some((call) => call.path === "/studio/storage")).toBe(false);
  });
});
