import {act,fireEvent,render,screen,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,expect,it,vi} from "vitest";
import {NotebookControl} from "../components/reading/NotebookControl";
import {GeneralNotebook} from "../components/reading/GeneralNotebook";
import {AutoGrowTextarea} from "../components/reading/AutoGrowTextarea";
import {notebookKey,newPersonalNote,guestNotebook} from "../lib/reading/notebook";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn(),prefetch:vi.fn()}),usePathname:()=>"/notlar"}));
beforeEach(()=>{localStorage.clear();vi.restoreAllMocks();});
it("creates an independent guest note from the split header and protects an unsaved draft",async()=>{
 const user=userEvent.setup();render(<NotebookControl/>);
 expect(screen.getByRole("link",{name:"Defterim · kayıtlı notlar"}).getAttribute("href")).toBe("/notlar");
 await user.click(screen.getByRole("button",{name:"Serbest Not oluştur"}));
 const dialog=screen.getByRole("dialog",{name:"Serbest Not oluştur"});
 await user.type(within(dialog).getByLabelText("Serbest Notun"),"Bağımsız düşünce #okuma");
 await user.click(within(dialog).getByRole("button",{name:"Serbest Notu kapat"}));
 expect(within(dialog).getByRole("alert").textContent).toContain("henüz kaydedilmedi");
 await user.click(within(dialog).getByRole("button",{name:"Yazmaya devam et"}));
 await user.click(within(dialog).getByRole("button",{name:"Kaydet"}));expect(guestNotebook()[0].body).toBe("Bağımsız düşünce #okuma");
 await user.click(within(dialog).getByRole("button",{name:"Serbest Notu kapat"}));expect(screen.queryByRole("dialog")).toBeNull();
});
it("finds and reopens the fifteenth saved freeform note without losing other records",async()=>{
 const notes=Array.from({length:15},(_,i)=>newPersonalNote(`Düşünce ${i+1} #okuma`,"lavender"));localStorage.setItem(notebookKey(),JSON.stringify(notes));
 const user=userEvent.setup();render(<GeneralNotebook/>);
 await user.type(screen.getByLabelText("Serbest Notlarda ara"),"Düşünce 15");
 await user.click(screen.getByRole("button",{name:"Notu düzenle: Düşünce 15 #okuma"}));
 expect((screen.getByLabelText("Serbest Notun")as HTMLTextAreaElement).value).toBe("Düşünce 15 #okuma");
 await user.clear(screen.getByLabelText("Serbest Notun"));await user.type(screen.getByLabelText("Serbest Notun"),"Güncellenen son not #okuma");await user.click(screen.getByRole("button",{name:"Kaydet"}));
 expect(guestNotebook()).toHaveLength(15);expect(guestNotebook()[0].id).toBe(notes[14].id);
});
it("grows the visible field smoothly to measured content and caps height with internal scrolling",()=>{
 let contentHeight=200;vi.spyOn(HTMLTextAreaElement.prototype,"scrollHeight","get").mockImplementation(()=>contentHeight);
 const {rerender}=render(<AutoGrowTextarea value="Kısa" onChange={()=>{}} minHeight={260} aria-label="Yazı"/>);
 const field=screen.getByLabelText("Yazı") as HTMLTextAreaElement;expect(field.style.height).toBe("260px");
 contentHeight=400;rerender(<AutoGrowTextarea value="Uzun" onChange={()=>{}} minHeight={260} aria-label="Yazı"/>);expect(field.style.height).toBe("402px");
 contentHeight=1500;act(()=>fireEvent(window,new Event("resize")));expect(parseFloat(field.style.height)).toBeLessThanOrEqual(window.innerHeight*.56);expect(field.style.overflowY).toBe("auto");
});
