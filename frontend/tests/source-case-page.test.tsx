import { fireEvent, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { SourceCasePage } from "../components/reading/SourceCasePage";
import { renderWithSite } from "./support/memory-site";
it("lets the owner compare source edits, strict tracking, clean view and undo without storing real notes",()=>{
 localStorage.clear();renderWithSite(<SourceCasePage/>);
 const sample=screen.getByRole("region",{name:"03 · Saatte → saatlerde"});
 expect(within(sample).getAllByText("Kaynak değişti").length).toBeGreaterThan(0);
 fireEvent.change(within(sample).getByRole("combobox",{name:/^Kaynak takibi$/}),{target:{value:"exact"}});
 expect(sample.querySelector(".source-case-reading mark")).toBeNull();
 fireEvent.change(within(sample).getByRole("combobox",{name:/^Kaynak takibi$/}),{target:{value:"follow"}});
 expect(sample.querySelector(".source-case-reading mark")?.textContent).toBe("saatlerde");
 fireEvent.click(within(sample).getByRole("button",{name:"Notlar açık"}));
 expect(sample.querySelector(".source-case-notes")).toBeNull();
 fireEvent.click(within(sample).getByRole("button",{name:"Özgün sürüme dön"}));
 expect(within(sample).getByText("Kaynak yerinde")).toBeTruthy();
 expect(Object.keys(localStorage).some(k=>k.includes("reading:"))).toBe(false);
});
