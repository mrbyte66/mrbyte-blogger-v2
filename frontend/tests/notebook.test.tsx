import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,expect,it,vi} from "vitest";
import {GeneralNotebook} from "../components/reading/GeneralNotebook";
import {guestNotebook,hashtags} from "../lib/reading/notebook";
import {stackNotes} from "../lib/reading/layout";
beforeEach(()=>{localStorage.clear();vi.restoreAllMocks();});
it("stores general guest notes with searchable hashtags and allows update and delete",async()=>{
 const user=userEvent.setup();const view=render(<GeneralNotebook/>);expect(screen.getByText(/Tarayıcı verileri temizlenirse/)).toBeTruthy();
 await user.type(screen.getByLabelText("Serbest Notun"),"Bekleme hakkında #java #okuma");await user.click(screen.getByRole("button",{name:"Kaydet"}));
 expect(guestNotebook()).toHaveLength(1);const id=guestNotebook()[0].id;
 await user.clear(screen.getByLabelText("Serbest Notun"));await user.type(screen.getByLabelText("Serbest Notun"),"Yeni çıkarım #java");await user.click(screen.getByRole("button",{name:"Kaydet"}));expect(guestNotebook()[0]).toMatchObject({id,body:"Yeni çıkarım #java"});
 view.unmount();render(<GeneralNotebook/>);await user.type(screen.getByLabelText("Serbest Notlarda ara"),"#okuma");expect(screen.getByText("Bu aramada not bulunamadı.")).toBeTruthy();
 await user.clear(screen.getByLabelText("Serbest Notlarda ara"));await user.click(screen.getByRole("button",{name:"Serbest Notu sil: Yeni çıkarım #java"}));expect(guestNotebook()).toEqual([]);
});
it("keeps unsaved text and reports a browser storage failure",async()=>{
 const user=userEvent.setup();render(<GeneralNotebook/>);await user.type(screen.getByLabelText("Serbest Notun"),"Kaybolmaması gereken düşünce");
 vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw new Error("quota");});await user.click(screen.getByRole("button",{name:"Kaydet"}));expect(screen.getByRole("alert").textContent).toContain("kaydedilemedi");expect((screen.getByLabelText("Serbest Notun")as HTMLTextAreaElement).value).toContain("Kaybolmaması");
});
it("keeps a draft when starting another note would discard it",async()=>{
 const user=userEvent.setup();render(<GeneralNotebook/>);await user.type(screen.getByLabelText("Serbest Notun"),"Taslak");await user.click(screen.getAllByRole("button",{name:"Yeni Serbest Not"})[0]);expect(screen.getByRole("alert").textContent).toContain("önce yazdıklarını kaydet");expect((screen.getByLabelText("Serbest Notun")as HTMLTextAreaElement).value).toBe("Taslak");
});
it("extracts unique Turkish hashtags without treating punctuation as tags",()=>{expect(hashtags("#Yazılım #yazılım #java-test, #öğrenme!")).toEqual(["#yazılım","#java-test","#öğrenme"]);});
it("stacks measured notes deterministically without collisions at shared or close anchors",()=>{
 const positions=stackNotes([{id:"b",y:10,height:80},{id:"a",y:10,height:200},{id:"c",y:40,height:90}]);expect(positions).toEqual([{id:"a",top:10},{id:"b",top:222},{id:"c",top:314}]);
});
