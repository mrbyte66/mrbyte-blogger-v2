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


it("packs a note column from the top in source order, closing gaps when cards resize or disappear",()=>{
 const cards=[{id:"late",y:1400,height:180},{id:"first",y:600,height:240},{id:"second",y:600,height:90}];
 expect(stackNotes(cards,12,82)).toEqual([{id:"first",top:82},{id:"second",top:334},{id:"late",top:436}]);
 expect(stackNotes(cards.map(m=>m.id==="first"?{...m,height:100}:m),12,82)).toEqual([{id:"first",top:82},{id:"second",top:194},{id:"late",top:296}]);
 expect(stackNotes(cards.filter(m=>m.id!=="first"),12,82)).toEqual([{id:"second",top:82},{id:"late",top:184}]);
 expect(cards[0].id).toBe("late");
});

it("keeps a long packed list collision-free and compact mode below the article",()=>{
 const cards=Array.from({length:15},(_,i)=>({id:`note-${String(i).padStart(2,"0")}`,y:1000+i*200,height:80+i*8}));
 const packed=stackNotes(cards,12,80);
 expect(packed[0].top).toBe(80);
 for(let i=1;i<packed.length;i++)expect(packed[i].top).toBe(packed[i-1].top+cards[i-1].height+12);
 expect(stackNotes(cards,12,1800)[0].top).toBe(1800);
 expect(stackNotes([],12,82)).toEqual([]);
});
