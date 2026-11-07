import { describe, expect, it, vi, beforeEach } from "vitest";
import { api, ApiError } from "../lib/api/http";
import { bytes, remaining, upload, type StorageFile } from "../lib/storage";
vi.mock("../lib/api/http", async original => ({ ...await original<typeof import("../lib/api/http")>(), api: vi.fn() }));
const entry: StorageFile = { id:"abc",name:"test.bin",sizeBytes:10,uploadedBytes:0,fingerprint:"a".repeat(64),state:"UPLOADING",passwordRequired:false,retentionHours:24,expiresAt:"2026-11-07T00:00:00Z" };
beforeEach(() => { vi.mocked(api).mockReset(); });
describe("temporary storage transfer",()=>{
 it("resumes from the committed server offset after a lost chunk response",async()=>{
  const partial={...entry,uploadedBytes:8}; const ready={...entry,uploadedBytes:10,state:"READY" as const};
  vi.mocked(api).mockRejectedValueOnce(new ApiError(0,"NETWORK","offline"))
   .mockResolvedValueOnce({data:partial,status:200,etag:null})
   .mockResolvedValueOnce({data:{...ready,state:"UPLOADING"},status:200,etag:null})
   .mockResolvedValueOnce({data:ready,status:200,etag:null});
  const file=new File([new Uint8Array(10)],"test.bin");
  const result=await upload(file,entry,new AbortController().signal,vi.fn());
  expect(result.state).toBe("READY");
  expect(vi.mocked(api).mock.calls.map(c=>c[1])).toEqual(["/studio/files/abc/chunks?offset=0","/studio/files/abc","/studio/files/abc/chunks?offset=8","/studio/files/abc/complete"]);
 });
 it("never retries an authorization failure or sends complete after one",async()=>{
  const failure = new ApiError(403,"FORBIDDEN","denied");
  vi.mocked(api).mockRejectedValue(failure);
  const result = await upload(new File(["hello"],"test.bin"),entry,new AbortController().signal,vi.fn()).catch(e => e);
  expect(result).toBe(failure);
  expect(api).toHaveBeenCalledTimes(1);
 });
 it("pausing prevents any further chunk or completion",async()=>{
  const controller=new AbortController();controller.abort();
  await expect(upload(new File(["hello"],"test.bin"),entry,controller.signal,vi.fn())).rejects.toBeDefined();
  expect(api).not.toHaveBeenCalled();
 });
 it("uses decimal GB and handles exact expiry",()=>{
  expect(bytes(50_000_000_000)).toBe("50 GB");
  expect(remaining("2026-11-07T00:00:00Z",Date.parse("2026-11-07T00:00:00Z"))).toBe("Süresi doldu");
 });
});

import { duration, transferStats } from "../lib/storage";
it("reports percent, speed since the transfer started and the time left", () => {
  const started = { at: 0, bytes: 1_000_000_000 };
  const stats = transferStats({ sizeBytes: 15_000_000_000, uploadedBytes: 6_000_000_000 }, started, 100_000);
  expect(stats.percent).toBe(40);
  expect(stats.speed).toBe(50_000_000);
  expect(duration(stats.left)).toBe("3 dk");
  expect(transferStats({ sizeBytes: 10, uploadedBytes: 5 }, { at: 0, bytes: 5 }, 1000).speed).toBe(0);
  expect(duration(45)).toBe("45 sn"); expect(duration(4380)).toBe("1 sa 13 dk"); expect(duration(NaN)).toBe("");
});
