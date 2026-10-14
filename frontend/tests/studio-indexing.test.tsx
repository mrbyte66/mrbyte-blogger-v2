import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteIndexing } from "../components/builder/SiteIndexing";
import { api, ApiError } from "../lib/api/http";
vi.mock("../lib/api/http", async (original) => ({...await original<typeof import("../lib/api/http")>(),api:vi.fn()}));
const settings = {indexingEnabled:false,deploymentIndexingEnabled:false,version:3};
beforeEach(()=>vi.mocked(api).mockReset());
describe("site indexing control",()=>{
  it("uses the versioned site API and keeps the development guard explicit",async()=>{
    vi.mocked(api).mockResolvedValueOnce({data:settings,etag:'"3"',status:200}).mockResolvedValueOnce({data:{...settings,indexingEnabled:true,version:4},etag:'"4"',status:200});
    render(<SiteIndexing />);
    const toggle=screen.getByRole("switch");
    await waitFor(()=>expect(toggle.hasAttribute("disabled")).toBe(false));
    fireEvent.click(toggle);
    await waitFor(()=>expect((toggle as HTMLInputElement).checked).toBe(true));
    expect(api).toHaveBeenLastCalledWith("PATCH","/studio/site",{ifMatch:3,body:{indexingEnabled:true}});
    expect(screen.getByText(/geliştirme ortamı her durumda/)).toBeTruthy();
  });
  it("does not claim success or change the switch when saving fails",async()=>{
    vi.mocked(api).mockResolvedValueOnce({data:settings,etag:'"3"',status:200}).mockRejectedValueOnce(new ApiError(412,"PRECONDITION_FAILED","Ayar başka bir yerde değişti."));
    render(<SiteIndexing />);
    await waitFor(()=>expect(screen.getByRole("switch").hasAttribute("disabled")).toBe(false));
    fireEvent.click(screen.getByRole("switch"));
    await screen.findByRole("alert");
    expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByText("Site tercihi kaydedildi.")).toBeNull();
  });
});
