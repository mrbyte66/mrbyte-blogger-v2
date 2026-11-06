import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { StoragePage } from "../components/storage/StoragePage";
import { SharedFilePage } from "../components/storage/SharedFilePage";
import { api, ApiError } from "../lib/api/http";
const state = vi.hoisted(() => ({ role: "guest", openAuth: vi.fn() }));
vi.mock("../components/auth/AuthProvider", () => ({ useAuth: () => ({ ready: true, openAuth: state.openAuth, session: state.role === "guest" ? null : { profile: { id: "owner", role: state.role } } }) }));
vi.mock("../components/storage/StorageShell", () => ({ StorageShell: ({children}: {children: ReactNode}) => <main>{children}</main> }));
vi.mock("../lib/api/http", async original => ({ ...await original<typeof import("../lib/api/http")>(), api: vi.fn() }));
beforeEach(() => { state.role = "guest"; vi.mocked(api).mockReset(); });
describe("storage access and management", () => {
 it("does not fetch the private file list for a visitor", () => {
  render(<StoragePage />); expect(screen.getByText(/Yükleme ve yönetim site sahibine ait/)).toBeTruthy(); expect(api).not.toHaveBeenCalled();
 });
 it("requires explicit delete confirmation and exposes duration extension only to owner", async () => {
  state.role = "owner";
  const file = { id:"file-1",name:"demo.zip",sizeBytes:12,uploadedBytes:12,state:"READY",passwordRequired:true,retentionHours:24,expiresAt:"2099-11-07T00:00:00Z",fingerprint:"a".repeat(64) };
  vi.mocked(api).mockResolvedValue({data:{items:[file],availableBytes:1000,quotaBytes:150000000000,maxFileBytes:50000000000,chunkBytes:8388608},status:200,etag:null});
  render(<StoragePage />); await screen.findByText("demo.zip");
  expect(screen.getByRole("button", {name:"Süreyi uzat"})).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:/^Sil$/}));
  expect(vi.mocked(api).mock.calls.some(c=>c[0]==="DELETE")).toBe(false);
  fireEvent.click(screen.getByRole("button",{name:"Kalıcı sil"}));
  await waitFor(()=>expect(api).toHaveBeenCalledWith("DELETE","/studio/files/file-1"));
 });
 it("keeps locked file details hidden and reports wrong passwords", async () => {
  vi.mocked(api).mockResolvedValueOnce({data:{id:"file-1",name:null,sizeBytes:null,passwordRequired:true,expiresAt:"2099-11-07T00:00:00Z"},status:200,etag:null});
  render(<SharedFilePage id="file-1"/>);
  await screen.findByLabelText("İndirme şifresi"); expect(screen.queryByRole("link",{name:/Dosyayı indir/})).toBeNull();
  vi.mocked(api).mockRejectedValueOnce(new ApiError(403,"STORAGE_PASSWORD","Şifre yanlış"));
  fireEvent.change(screen.getByLabelText("İndirme şifresi"),{target:{value:"wrong"}});
  fireEvent.click(screen.getByRole("button",{name:"Dosyayı aç"}));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent","Şifre yanlış");
 });
});
