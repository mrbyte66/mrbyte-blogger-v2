import { fireEvent, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { SourceCasePage } from "../components/reading/SourceCasePage";
import { sourceCases } from "../lib/reading/source-cases";
import { renderWithSite } from "./support/memory-site";

it("shows one mirror, applies the edit, supports strict tracking and restores the original without saving notes",()=>{
 localStorage.clear();renderWithSite(<SourceCasePage/>);
 const sample=screen.getByRole("region",{name:"Küçük bir düzeltme"});
 const after=()=>within(sample).getByRole("region",{name:"Sonra"});
 expect(after().querySelector("mark")?.textContent).toBe("aynı saatte");
 fireEvent.click(within(sample).getByRole("button",{name:"Saat ifadesini değiştir"}));
 expect(after().querySelector("mark")?.textContent).toBe("aynı saatlerde");
 fireEvent.click(within(sample).getByText("Takip tercihi"));
 fireEvent.change(within(sample).getByRole("combobox",{name:"Notun davranışı"}),{target:{value:"exact"}});
 expect(after().querySelector("mark")).toBeNull();
 fireEvent.change(within(sample).getByRole("combobox",{name:"Notun davranışı"}),{target:{value:"follow"}});
 expect(after().querySelector("mark")?.textContent).toBe("aynı saatlerde");
 fireEvent.click(within(sample).getByRole("switch",{name:"Notları göster"}));
 expect(screen.queryByRole("generic",{name:"Örnekteki notlar"})).toBeNull();
 expect(sample.querySelector(".mirror-notes")).toBeNull();
 expect(after().querySelector("mark")).toBeNull();
 fireEvent.click(within(sample).getByRole("button",{name:/Geri al/}));
 fireEvent.click(within(sample).getByRole("switch",{name:"Notları göster"}));
 expect(after().querySelector("mark")?.textContent).toBe("aynı saatte");
 expect(Object.keys(localStorage).some(k=>k.includes("reading:"))).toBe(false);
});
it("lets every case be selected and its actual resolution demonstrated, including removed blocks and independent notes",()=>{
 renderWithSite(<SourceCasePage/>);
 for(const [i,example] of sourceCases.entries()){
  fireEvent.change(screen.getByRole("combobox",{name:"Tüm örnekler"}),{target:{value:String(i)}});
  const sample=screen.getByRole("region",{name:example.title});
  expect(screen.getAllByRole("region").filter(r=>r.classList.contains("source-mirror"))).toHaveLength(1);
  fireEvent.click(within(sample).getByRole("button",{name:example.action}));
  expect(within(sample).getByRole("status").textContent).toContain(example.result);
  const after=()=>within(sample).getByRole("region",{name:"Sonra"});
  expect(!!after().querySelector("mark")).toBe(!["review","removed"].includes(example.expected));
  if(example.multiple){
   fireEvent.click(within(sample).getByText("Takip tercihi"));
   fireEvent.change(within(sample).getByRole("combobox",{name:"Notun davranışı"}),{target:{value:"exact"}});
   expect(after().querySelector("mark")?.textContent).toBe("aynı saatlerde");
   expect(within(sample).getByRole("status").textContent).toContain("İki notun takip tercihi farklı");
   fireEvent.click(within(sample).getByText("Bu notun tercihi"));
   fireEvent.change(within(sample).getByRole("combobox",{name:"İkinci notun davranışı"}),{target:{value:"exact"}});
   expect(after().querySelector("mark")).toBeNull();
  }
 }
 expect((screen.getByRole("button",{name:"Sonraki örnek"}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole("button",{name:"Önceki örnek"}));
 expect(screen.getByRole("region",{name:sourceCases[12].title})).toBeTruthy();
});
