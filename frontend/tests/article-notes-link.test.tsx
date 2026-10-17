import {render,screen,act} from "@testing-library/react";
import {beforeEach,it,expect,vi} from "vitest";
import type {Article} from "../lib/content";
import type {ReadingMark} from "../lib/reading/model";
import {SourceNotes} from "../components/reading/SourceNotes";
import {ArticleNotesLink} from "../components/reading/ArticleNotesLink";
const auth=vi.hoisted(()=>({session:{profile:{id:"reader-a",verified:true}}}));
const data=vi.hoisted(()=>({articles:[{id:"article-id",slug:"sample",title:"Deneme"}]}));
vi.mock("../lib/articles/use-articles",()=>({useArticles:()=>data}));
const load=vi.hoisted(()=>vi.fn());
vi.mock("../components/auth/AuthProvider",()=>({useAuth:()=>auth}));
vi.mock("../lib/reading/server",()=>({loadServerMarks:load}));
const article={id:"article-id",slug:"sample"} as Article;
beforeEach(()=>{auth.session={profile:{id:"reader-a",verified:true}};load.mockReset();});
it("counts text and audio notes for public summaries without requiring an editing revision",async()=>{
 load.mockResolvedValue([{kind:"note"},{kind:"audio"},{kind:"underline"},{kind:"bookmark"}]);render(<ArticleNotesLink article={article}/>);
 expect((await screen.findByRole("link",{name:"2 not · Yazının kalıcı bağlantısını aç"})).getAttribute("href")).toBe("/yazilar/sample");expect(load.mock.calls[0][0]).toEqual({id:"article-id"});
});
it("does not display a previous account's count after the session changes",async()=>{
 let finish!:(marks:ReadingMark[])=>void;load.mockImplementationOnce(()=>new Promise<ReadingMark[]>(resolve=>{finish=resolve;})).mockResolvedValueOnce([{kind:"note"}]);
 const view=render(<ArticleNotesLink article={article}/>);auth.session={profile:{id:"reader-b",verified:true}};view.rerender(<ArticleNotesLink article={article}/>);
 await screen.findByRole("link",{name:"1 not · Yazının kalıcı bağlantısını aç"});await act(async()=>finish([{kind:"note"},{kind:"note"}] as ReadingMark[]));expect(screen.queryByRole("link",{name:"2 not · Yazının kalıcı bağlantısını aç"})).toBeNull();
});
it("reports an unavailable count without presenting it as zero",async()=>{
 load.mockRejectedValue(new Error("offline"));render(<ArticleNotesLink article={article}/>);expect(await screen.findByText("—")).toBeTruthy();expect(screen.queryByRole("link",{name:"0 not · Yazının kalıcı bağlantısını aç"})).toBeNull();
});

it("also lists account source notes from summaries without an editing revision",async()=>{
 load.mockResolvedValue([{id:"private-note",kind:"note",note:"Özel düşünce",fragments:[{anchorId:"excerpt",start:0,end:4,quote:"Özet",before:"",after:""}]}]);render(<SourceNotes/>);
 expect((await screen.findByRole("link",{name:/Deneme Özel düşünce/})).getAttribute("href")).toBe("/yazilar/sample?not=private-note");expect(load.mock.calls[0][0]).toEqual({id:"article-id"});
});
