import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { StoragePage } from "../components/storage/StoragePage";
import { api } from "../lib/api/http";
import { upload } from "../lib/storage";

vi.mock("../components/auth/AuthProvider", () => ({ useAuth: () => ({ ready: true, openAuth: vi.fn(), session: { profile: { id: "owner", role: "owner" } } }) }));
vi.mock("../components/storage/StorageShell", () => ({ StorageShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("../lib/api/http", async (original) => ({ ...await original<typeof import("../lib/api/http")>(), api: vi.fn() }));
vi.mock("../lib/storage", async (original) => ({ ...await original<typeof import("../lib/storage")>(), fingerprint: vi.fn(async () => "f".repeat(64)), upload: vi.fn() }));

const entry = { id: "file-1", name: "arsiv.zip", sizeBytes: 15_000_000_000, uploadedBytes: 0, state: "UPLOADING", passwordRequired: false, retentionHours: 24, expiresAt: "2099-11-07T00:00:00Z", fingerprint: "f".repeat(64) };
beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.mocked(api).mockImplementation(async (method: string, path: string) => ({ data: method === "POST" && path === "/studio/files" ? entry : { items: [], availableBytes: 100_000_000_000, quotaBytes: 150_000_000_000, maxFileBytes: 50_000_000_000, chunkBytes: 8_388_608 }, status: 200, etag: null }) as never);
  // The transfer reports one step and then runs until it is aborted.
  vi.mocked(upload).mockImplementation((_file, initial, signal, progress) => new Promise((_, reject) => {
    progress({ ...initial, uploadedBytes: 6_000_000_000 });
    signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  }));
});

async function startUpload() {
  render(<StoragePage />);
  await screen.findByText("Alan hazır.");
  const file = new File(["x"], "arsiv.zip"); Object.defineProperty(file, "size", { value: entry.sizeBytes });
  fireEvent.change(screen.getByLabelText("Yüklenecek dosya"), { target: { files: [file] } });
  // jsdom cannot see a scripted file in a required input, so the form is submitted directly.
  fireEvent.submit(screen.getByRole("button", { name: "Yüklemeyi başlat" }).closest("form")!);
}

it("shows the percentage where the upload was started and in the tab title", async () => {
  await startUpload();
  expect(await screen.findByText("%40")).toBeTruthy();
  expect(screen.getByLabelText("Yükleme ilerlemesi: yüzde 40")).toBeTruthy();
  expect(document.title).toBe("%40 · Dosya alanı");
});

it("cancels only after confirmation and removes the half-uploaded file", async () => {
  await startUpload();
  await screen.findByText("%40");
  fireEvent.click(screen.getByRole("button", { name: "İptal et" }));
  expect(vi.mocked(api).mock.calls.some((call) => call[0] === "DELETE")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Devam et" }));
  expect(screen.getByText("%40")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "İptal et" }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Evet, iptal et" })); });
  await waitFor(() => expect(api).toHaveBeenCalledWith("DELETE", "/studio/files/file-1"));
  expect(await screen.findByText("Yükleme iptal edildi; yarım kalan dosya silindi.")).toBeTruthy();
});

it("pausing keeps the half-uploaded file for resuming", async () => {
  await startUpload();
  await screen.findByText("%40");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Duraklat" })); });
  expect(await screen.findByText(/Yükleme duraklatıldı/)).toBeTruthy();
  expect(vi.mocked(api).mock.calls.some((call) => call[0] === "DELETE")).toBe(false);
});
