import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,expect,it,vi} from "vitest";
import {useEffect} from "react";
import {GeneralNotebook} from "../components/reading/GeneralNotebook";
import {guestNotebook,recordings,newPersonalNote,notebookKey,sameNotebookContent,noteTags} from "../lib/reading/notebook";
const {blobs}=vi.hoisted(()=>({blobs:new Map<string,Blob>()}));
vi.mock("../lib/reading/audio",()=>({storeAudio:async(scope:string,id:string,b:Blob)=>{blobs.set(`${scope}:${id}`,b);},readAudio:async(scope:string,id:string)=>blobs.get(`${scope}:${id}`)??null,removeAudio:async(scope:string,id:string)=>{blobs.delete(`${scope}:${id}`);},audioInput:async(b:Blob,durationMs:number)=>({data:"valid",mime:b.type,durationMs})}));
vi.mock("../components/reading/VoiceNote",()=>({RecordingButton:({onRecorded,onBusyChange}:{onRecorded:(b:Blob,d:number)=>void;onBusyChange:(b:boolean)=>void})=>{useEffect(()=>{onBusyChange?.(true);return()=>onBusyChange?.(false);},[onBusyChange]);return <button onClick={()=>onRecorded(new Blob(["test recording"],{type:"audio/webm"}),2000)}>Kaydı bitir</button>;},VoicePlayback:({label}:{label:string})=><audio aria-label={label}/> }));
beforeEach(()=>{localStorage.clear();blobs.clear();});
it("adds and removes explicit tags with Turkish normalization and persists the card",async()=>{
 const user=userEvent.setup();render(<GeneralNotebook/>);await user.type(screen.getByLabelText("Serbest Notun"),"Etiketli düşünce");await user.type(screen.getByLabelText("Not başlığı"),"Atlas notu");
 await user.click(screen.getByRole("button",{name:"Etiket ekle"}));await user.type(screen.getByLabelText("Yeni etiket"),"#YAZILIM{Enter}");await user.click(screen.getByRole("button",{name:"Etiket penceresini kapat"}));await user.click(screen.getByRole("button",{name:"Kaydet"}));
 expect(guestNotebook()[0]).toMatchObject({title:"Atlas notu",tags:["yazılım"]});await user.click(screen.getByRole("button",{name:"#yazılım etiketini kaldır"}));await user.click(screen.getByRole("button",{name:"Kaydet"}));expect(guestNotebook()[0].tags).toEqual([]);
 await user.click(screen.getByRole("button",{name:"Liste görünümü"}));expect(screen.getByRole("button",{name:"Liste görünümü"}).getAttribute("aria-pressed")).toBe("true");expect(screen.getByText("Atlas notu")).toBeTruthy();
});
it("appends a second recording without overwriting the first and deletes only the selected attachment",async()=>{
 const user=userEvent.setup();render(<GeneralNotebook/>);await user.type(screen.getByLabelText("Serbest Notun"),"İki sesli düşünce");
 await user.click(screen.getByRole("button",{name:"Ses kaydı"}));expect(screen.getByRole("button",{name:"Kaydet"}).hasAttribute("disabled")).toBe(true);await user.click(screen.getByRole("button",{name:"Kaydı bitir"}));await user.click(screen.getByRole("button",{name:"Kaydet"}));const first=recordings(guestNotebook()[0])[0];
 await user.click(screen.getByRole("button",{name:"Ses kaydı"}));expect(screen.getByLabelText(new RegExp(`Kayıt 1 · ${first.id}`))).toBeTruthy();await user.click(screen.getByRole("button",{name:"Kaydı bitir"}));await user.click(screen.getByRole("button",{name:"Kaydet"}));
 const both=recordings(guestNotebook()[0]);expect(both).toHaveLength(2);expect(both[0].id).toBe(first.id);expect(blobs.size).toBe(2);
 await user.click(screen.getByRole("button",{name:"1. ses kaydını kaldır"}));await user.click(screen.getByRole("button",{name:"Kaydet"}));expect(recordings(guestNotebook()[0]).map(c=>c.id)).toEqual([both[1].id]);expect(blobs.size).toBe(1);
});
it("keeps a legacy single recording available when opening an older browser note",async()=>{
 const legacy={...newPersonalNote("Eski ses notu","mint"),recordings:undefined,audio:{mime:"audio/webm",durationMs:1000}};localStorage.setItem(notebookKey(),JSON.stringify([legacy]));
 render(<GeneralNotebook/>);await userEvent.setup().click(screen.getByRole("button",{name:"Notu düzenle: Eski ses notu"}));expect(screen.getByLabelText(`Kayıt 1 · ${legacy.id}`)).toBeTruthy();expect(recordings(guestNotebook()[0])[0].id).toBe(legacy.id);
});

it("retains a guest copy when an existing account note has different tags or attachments",()=>{
 const a={...newPersonalNote("Aynı metin","mint"),tags:["okuma"],recordings:[{id:crypto.randomUUID(),mime:"audio/webm",durationMs:1000}]};
 expect(sameNotebookContent(a,{...a})).toBe(true);expect(sameNotebookContent(a,{...a,title:"Başka başlık"})).toBe(false);expect(sameNotebookContent(a,{...a,tags:["başka"]})).toBe(false);expect(sameNotebookContent(a,{...a,recordings:[{...a.recordings[0],id:crypto.randomUUID()}]})).toBe(false);
});

it("keeps inline hashtags compatible with the twelve-tag notebook limit",()=>{
 expect(noteTags(newPersonalNote(Array.from({length:15},(_,i)=>`#etiket${i}`).join(" "),"mint"))).toHaveLength(12);
});
