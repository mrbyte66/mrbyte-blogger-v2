import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SourceCasePage } from "../components/reading/SourceCasePage";
import { sourceCases } from "../lib/reading/source-cases";
import { renderWithSite } from "./support/memory-site";
vi.mock("next/navigation",()=>({usePathname:()=>"/studio/not-senaryolari"}));
afterEach(()=>vi.restoreAllMocks());
const route=["suffix","prefix","reorder","split","merge","meaning","rewrite","duplicate","remaining-copy","deleted","block-removed","undo","overlap","unchanged"];
const sample=()=>screen.getByRole("region",{name:"Küçük bir düzeltme"});

it("keeps one clear action, demonstrates the real change and undo, and uses shared site chrome",()=>{
 localStorage.clear();renderWithSite(<SourceCasePage/>);
 expect(screen.getByRole("link",{name:"MrByte Studio"})).toBeTruthy();
 expect(screen.getByRole("contentinfo",{name:"Site alt bilgisi"})).toBeTruthy();
 expect(screen.queryByRole("combobox")).toBeNull();
 expect(screen.queryByRole("switch",{name:"Notları göster"})).toBeNull();
 expect(screen.queryByRole("textbox")).toBeNull();
 const current=()=>within(sample()).getByRole("region",{name:"Sonra"});
 expect(current().querySelector("mark")?.textContent).toBe("aynı saatte");
 fireEvent.click(within(sample()).getByRole("button",{name:"Saat ifadesini değiştir"}));
 expect(current().querySelector("mark")?.textContent).toBe("aynı saatlerde");
 expect(within(sample()).getByRole("button",{name:"Devam et →"})).toBeTruthy();
 fireEvent.click(within(sample()).getByRole("button",{name:"↶ Geri al"}));
 expect(current().querySelector("mark")?.textContent).toBe("aynı saatte");
 expect(Object.keys(localStorage).some(k=>k.includes("reading:"))).toBe(false);
});
it("teaches all fourteen cases sequentially without losing notes or silently highlighting ambiguous sources",()=>{
 renderWithSite(<SourceCasePage/>);
 for(const id of route){
  const example=sourceCases.find(c=>c.id===id)!;
  const current=screen.getByRole("region",{name:example.title});
  expect(document.querySelectorAll(".source-mirror")).toHaveLength(1);
  fireEvent.click(within(current).getByRole("button",{name:example.action}));
  expect(within(current).getByRole("status").textContent).toContain(example.result);
  const after=within(current).getByRole("region",{name:"Sonra"});
  expect(!!after.querySelector("mark")).toBe(!["review","removed"].includes(example.expected));
  expect(within(current).getByRole("article",{name:"İşaretli metne bağlı not"}).textContent).toContain(example.note);
  if(example.multiple)expect(within(current).getByRole("article",{name:"Aynı metne bağlı ikinci not"})).toBeTruthy();
  fireEvent.click(within(current).getByRole("button",{name:id===route.at(-1)?"Baştan dene ↺":"Devam et →"}));
 }
 expect(screen.getByRole("region",{name:"Küçük bir düzeltme"})).toBeTruthy();
 expect((within(sample()).getByRole("button",{name:"Önceki örnek"}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(within(sample()).getByRole("button",{name:"Saat ifadesini değiştir"}));
 fireEvent.click(within(sample()).getByRole("button",{name:"Devam et →"}));
 expect(document.activeElement?.textContent).toBe("Başına cümle ekle");
 fireEvent.click(screen.getByRole("button",{name:"Önceki örnek"}));
 expect(within(sample()).getByRole("button",{name:"Saat ifadesini değiştir"})).toBeTruthy();
});
it("measures the actual highlight for the arrow, recomputes after resizing, and falls back only to the old quote when removed",()=>{
 let delta=0;
 vi.spyOn(Element.prototype,"getClientRects").mockImplementation(function(this:Element){return [new DOMRect(this.closest('.mirror-after')?500+delta:100,80,70,20)] as unknown as DOMRectList;});
 vi.spyOn(Element.prototype,"getBoundingClientRect").mockImplementation(function(this:Element){return this.matches('.mirror-reader')?new DOMRect(0,0,1000,300):this.matches('.mirror-note')?new DOMRect(760,24,236,110):new DOMRect(0,0,100,100);});
 renderWithSite(<SourceCasePage/>);
 const wire=()=>document.querySelector('.mirror-wire')!;
 expect(wire().getAttribute('d')).toMatch(/^M574,90/);
 expect(wire().getAttribute('marker-end')).toContain('url(#');
 delta=40;fireEvent(window,new Event('resize'));
 expect(wire().getAttribute('d')).toMatch(/^M614,90/);
 // Advance as a user, keeping source resolution and the compact note together.
 for(const id of route.slice(0,7)){
  const c=sourceCases.find(c=>c.id===id)!;
  fireEvent.click(screen.getByRole('button',{name:c.action}));
  if(id==='rewrite')expect(wire().getAttribute('d')).toMatch(/^M174,90/);
  fireEvent.click(screen.getByRole('button',{name:'Devam et →'}));
 }
});
