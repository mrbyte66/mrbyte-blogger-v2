import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithSite as render } from "./support/memory-site";
import { ThemeRenderer } from "../components/builder/ThemeRenderer";
import { DocumentPreview } from "../components/builder/DocumentPreview";
import { articles } from "../lib/content";
import { initialSeries } from "../lib/series/model";
import { PublicFrame } from "../components/PublicFrame";
import { createTheme, type Starter, type Surface } from "../lib/builder/model";

let path = "/";
vi.mock("next/navigation", () => ({usePathname: () => path}));
vi.mock("../components/Experience", () => ({Experience: () => <section className="experience">CRT</section>}));
beforeEach(() => { path = "/"; vi.stubGlobal("matchMedia", vi.fn(() => ({matches:false}))); Object.defineProperty(Element.prototype,"scrollIntoView",{configurable:true,value:vi.fn()}); });
const starters: Starter[] = ["scene", "feed", "magazine"];
const surfaces: Surface[] = ["paper", "night", "warm"];

describe("one shared footer", () => {
  it.each(starters.flatMap(starter => surfaces.map(surface => ({starter,surface}))))("matches public/Studio for $starter / $surface", ({starter,surface}) => {
    const theme = {...createTheme(starter),surface};
    theme.blocks = theme.blocks.map(block => block.kind === "footer" ? {...block,text:"Benim özel imzam"} : block);
    const {container,rerender} = render(<PublicFrame><ThemeRenderer theme={theme}/></PublicFrame>);
    const footer = screen.getByRole("contentinfo",{name:"Site alt bilgisi"});
    expect(container.querySelectorAll(".public-footer")).toHaveLength(1);
    const text = footer.textContent;
    expect(text).toContain("Benim özel imzam");
    for (const name of ["Yazılar","Seriler","Hakkımda"]) expect(within(footer).getByRole("link",{name}).getAttribute("href")).toBeTruthy();
    path="/preview";
    rerender(<ThemeRenderer theme={theme} preview/>);
    expect(screen.getByRole("contentinfo",{name:"Site alt bilgisi"}).textContent).toBe(text);
    expect(container.querySelector(".public-frame")?.className).toContain(`surface-${surface}`);
    expect(container.querySelector(".public-frame")?.className.includes("public-home-scene")).toBe(starter==="scene");
    expect(screen.getByRole("button",{name:"Mozart müziğini aç"}).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button",{name:"İletişim"}));
    expect(screen.getByText("İletişim formu yayındaki sitede kullanılabilir.")).toBeTruthy();
    expect(container.querySelector(".contact-form")).toBeNull();
  });
  it.each(["/notlar","/hesap","/kaydedilenler","/yazilar/ornek","/seriler/ornek"])("retains footer on %s", route => {
    path=route;
    render(<PublicFrame><main>İçerik</main></PublicFrame>);
    expect(screen.getAllByRole("contentinfo",{name:"Site alt bilgisi"})).toHaveLength(1);
  });
  it("selects the footer with mouse/keyboard without following links in Studio editing", () => {
    path="/preview";
    const select=vi.fn();
    const {container}=render(<ThemeRenderer theme={createTheme("scene")} preview selection={{id:"block-footer",request:0,editing:true}} onSelect={select}/>);
    const footer=screen.getByRole("group",{name:"Site alt bilgisi"});
    expect(container.querySelector(".theme-footer")).toBeNull();
    expect(footer.className).toContain("is-active");
    expect(fireEvent.click(within(footer).getByRole("link",{name:"Seriler"}))).toBe(false);
    expect(select).toHaveBeenLastCalledWith("block-footer");
    fireEvent.keyDown(footer,{key:"Enter"});
    expect(select).toHaveBeenCalledTimes(2);
  });
});


it.each(["article", "series"] as const)("uses the draft footer on the %s canvas", kind => {
  path="/preview";
  const theme=createTheme("scene");
  theme.blocks=theme.blocks.map(block=>block.kind==="footer" ? {...block,text:"Taslağa özel imza"} : block);
  const draft=kind==="article" ? {kind,article:articles[0]} : {kind,series:initialSeries[0]};
  const {container}=render(<DocumentPreview draft={draft} theme={theme} selection={{id:null,request:0,editing:false}} onSelect={()=>{}}/>);
  expect(screen.getByRole("contentinfo",{name:"Site alt bilgisi"}).textContent).toContain("Taslağa özel imza");
  expect(container.querySelectorAll(".public-footer")).toHaveLength(1);
  expect(container.querySelector(".public-home-scene")).toBeNull();
});
