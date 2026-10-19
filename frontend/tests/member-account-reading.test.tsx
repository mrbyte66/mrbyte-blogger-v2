import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthProvider } from "../components/auth/AuthProvider";
import { ReadingTools } from "../components/reading/ReadingTools";
import { readReadingDocument, writeReadingDocument } from "../lib/reading/storage";
import { useMemberVisit, useSeriesHistory } from "../lib/reading/history";
import { articles } from "../lib/content";
import { fakeBackend, settle } from "./support/fake-backend";
import { personalOf } from "./support/fake-member-api";

const ARTICLE = "40000000-0000-4000-8000-000000000001";
const BLOCK = "40000000-0000-4000-8000-0000000000b1";
const server = { id: ARTICLE, revisionId: "rev-1", blockIds: { paragraphs: [BLOCK] } };
const guestMark = { id: "guest-1", kind: "highlight" as const, note: "", createdAt: "2026-10-04T12:00:00.000Z", fragments: [{ anchorId: "paragraph-0", start: 0, end: 5, quote: "Hello", before: "", after: " world" }] };
let backend: ReturnType<typeof fakeBackend>;

function Page() {
  return <AuthProvider><article id="reading-content"><p data-reading-anchor="excerpt">Özet</p><p data-reading-anchor={BLOCK} data-reading-legacy="paragraph-0">Hello world</p></article>
    <ReadingTools articleId="sample" contentRootId="reading-content" server={server} /></AuthProvider>;
}
beforeEach(() => {
  localStorage.clear();
  backend = fakeBackend({ signedIn: { id: "reader-1", email: "reader@example.com" } });
  backend.state.member.publicArticles.set(ARTICLE, { slug: "sample", stats: { views: 0, claps: 0, saves: 0 } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("loads a verified member's marks from the account, never from browser storage", async () => {
  personalOf(backend.state.member, "reader-1").marks.push({ id: "m-1", articleId: ARTICLE, kind: "note", revisionId: "rev-1", note: "Hesaptaki not", createdAt: "2026-10-05T10:00:00Z", version: 0, fragments: [{ blockId: BLOCK, start: 0, end: 5, quote: "Hello", before: "", after: "" }] });
  render(<Page />);
  await act(settle);
  expect(screen.getByText("1 kayıt")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Notlar/ }));
  expect(screen.getByText("Hesaptaki not")).toBeTruthy();
  expect(screen.getByText(/hesabında saklanır/)).toBeTruthy();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "1. kaydı kaldır" })); await settle(); });
  expect(backend.state.calls.some((c) => c.method === "DELETE" && c.path === `/me/articles/${ARTICLE}/annotations/m-1`)).toBe(true);
  expect(personalOf(backend.state.member, "reader-1").marks).toEqual([]);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Son kaldırmayı geri al/ })); await settle(); });
  const undo = backend.state.calls.find((c) => c.method === "PUT" && c.path === `/me/articles/${ARTICLE}/annotations/m-1`);
  expect(undo?.headers["If-None-Match"]).toBe("*");
  expect(undo?.body?.fragments).toEqual([{ blockId: BLOCK, start: 0, end: 5, quote: "Hello", before: "", after: "" }]);
  expect(localStorage.length).toBe(0);
});

it("imports guest marks only when the member asks, translating legacy anchors", async () => {
  writeReadingDocument({ version: 1, articleId: "sample", marks: [guestMark] });
  render(<Page />);
  await act(settle);
  expect(screen.getByText("0 kayıt")).toBeTruthy();
  expect(backend.state.calls.some((c) => c.path === "/me/imports/annotations")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: /Notlar/ }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Misafir notlarını hesabıma aktar" })); await settle(); });
  const request = backend.state.calls.find((c) => c.path === "/me/imports/annotations");
  expect(request?.body?.items).toEqual([expect.objectContaining({ articleId: ARTICLE, revisionId: "rev-1", fragments: [expect.objectContaining({ blockId: BLOCK, quote: "Hello" })] })]);
  expect(readReadingDocument("sample").document.marks).toEqual([]);
  expect(screen.getByText("1 kayıt")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Misafir notlarını hesabıma aktar" })).toBeNull();
});

it("keeps guests on browser-only notes", async () => {
  backend.switchTo(null);
  writeReadingDocument({ version: 1, articleId: "sample", marks: [guestMark] });
  render(<Page />);
  await act(settle);
  expect(screen.getByText("1 kayıt")).toBeTruthy();
  expect(backend.state.calls.some((c) => c.path.startsWith("/me/"))).toBe(false);
});

it("creates a new note on a relocated highlight using the current revision's offsets", async () => {
  personalOf(backend.state.member, "reader-1").marks.push({ id: "old-highlight", articleId: ARTICLE, kind: "highlight", revisionId: "rev-1", note: "", createdAt: "2026-10-05T10:00:00Z", version: 0, fragments: [{ blockId: BLOCK, start: 2, end: 7, quote: "Hello", before: "A ", after: " B" }] });
  render(<AuthProvider><article id="reading-content"><p data-reading-anchor={BLOCK}>New A Hello B</p></article><ReadingTools articleId="sample" contentRootId="reading-content" server={{ ...server, revisionId: "rev-2" }} /></AuthProvider>);
  await act(settle);
  const paragraph = document.querySelector(`[data-reading-anchor="${BLOCK}"]`)!;
  Object.defineProperty(document, "caretPositionFromPoint", { configurable: true, value: () => ({ offsetNode: paragraph.firstChild, offset: 7 }) });
  try {
    window.getSelection()!.removeAllRanges();
    fireEvent.pointerUp(paragraph, { pointerType: "mouse", button: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Seçili metne not ekle" }));
    fireEvent.change(screen.getByLabelText("Bu alıntı için notun"), { target: { value: "Yeni bağlamda not" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Notu kaydet" })); await settle(); });
    const create = backend.state.calls.find(c => c.method === "PUT" && c.path.includes("/annotations/"));
    expect(create?.body).toMatchObject({ revisionId: "rev-2", fragments: [{ blockId: BLOCK, start: 6, end: 11, quote: "Hello", before: "New A ", after: " B" }] });
  } finally { Reflect.deleteProperty(document, "caretPositionFromPoint"); }
});

it("records a permalink visit for verified members only", async () => {
  function Visit() { useMemberVisit({ ...articles[0], id: ARTICLE, revisionId: "rev-1" }); return null; }
  render(<AuthProvider><Visit /></AuthProvider>);
  await act(settle);
  expect(personalOf(backend.state.member, "reader-1").visits).toEqual([{ articleId: ARTICLE, revisionId: "rev-1" }]);
  backend.switchTo({ id: "pending-1", email: "pending@example.com", verified: false });
  render(<AuthProvider><Visit /></AuthProvider>);
  await act(settle);
  expect(personalOf(backend.state.member, "pending-1").visits).toEqual([]);
});

it("replaces series history and records the current article when a verified account changes", async () => {
  const seriesId = "series-1";
  personalOf(backend.state.member, "reader-1").seriesHistory.set(seriesId, [{ articleId: ARTICLE, lastVisitedAt: "2026-10-13T10:00:00Z" }]);
  function History() { useMemberVisit({ ...articles[0], id: ARTICLE, revisionId: "rev-1" }); return <output data-testid="history">{JSON.stringify(useSeriesHistory(seriesId))}</output>; }
  render(<AuthProvider><History /></AuthProvider>); await act(settle);
  expect(screen.getByTestId("history").textContent).toContain(ARTICLE);
  backend.switchTo({ id: "reader-2", email: "other@example.test" });
  await act(async () => { window.dispatchEvent(new Event("focus")); await settle(); });
  expect(screen.getByTestId("history").textContent).not.toContain(ARTICLE);
  expect(personalOf(backend.state.member, "reader-2").visits).toEqual([{ articleId: ARTICLE, revisionId: "rev-1" }]);
});

it("keeps private notes isolated when the account changes on the same article", async () => {
  for (const [reader, note] of [["reader-1", "İlk hesabın özel notu"], ["reader-2", "İkinci hesabın özel notu"]]) {
    personalOf(backend.state.member, reader).marks.push({ id: reader + "-mark", articleId: ARTICLE, kind: "note", revisionId: "rev-1", note, createdAt: "2026-10-13T10:00:00Z", version: 0, fragments: [{ blockId: BLOCK, start: 0, end: 5, quote: "Hello", before: "", after: "" }] });
  }
  render(<Page />); await act(settle);
  fireEvent.click(screen.getByRole("button", { name: /Notlar/ }));
  expect(screen.getByText("İlk hesabın özel notu")).toBeTruthy();
  backend.switchTo({ id: "reader-2", email: "other@example.test" });
  await act(async () => { window.dispatchEvent(new Event("focus")); await settle(); });
  expect(screen.queryByText("İlk hesabın özel notu")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Notlar/ }));
  expect(screen.getByText("İkinci hesabın özel notu")).toBeTruthy();
  expect(localStorage.length).toBe(0);
});

it("updates a member note using its version and keeps the same private record",async()=>{
 personalOf(backend.state.member,"reader-1").marks.push({id:"edit-mark",articleId:ARTICLE,kind:"note",revisionId:"rev-1",note:"Eski not",createdAt:"2026-10-13T10:00:00Z",version:5,fragments:[{blockId:BLOCK,start:0,end:5,quote:"Hello",before:"",after:""}]});
 render(<Page/>);await act(settle);fireEvent.click(screen.getByRole("button",{name:/Notlar/}));fireEvent.click(screen.getByRole("button",{name:"Düzenle"}));fireEvent.change(screen.getByLabelText("Bu alıntı için notun"),{target:{value:"Güncel not"}});
 await act(async()=>{fireEvent.click(screen.getByRole("button",{name:"Notu kaydet"}));await settle();});
 const update=backend.state.calls.find(c=>c.method==="PUT"&&c.path.endsWith("/annotations/edit-mark"));expect(update?.headers["If-Match"]).toBe('"5"');expect(update?.headers["If-None-Match"]).toBeUndefined();expect(personalOf(backend.state.member,"reader-1").marks[0]).toMatchObject({id:"edit-mark",note:"Güncel not",version:6});expect(localStorage.length).toBe(0);
});

it("previews only the owner's private reader notes in Studio without writing annotations",async()=>{
 backend.switchTo({id:"reader-1",email:"owner@example.test",role:"owner"});
 personalOf(backend.state.member,"reader-1").marks.push({id:"preview-note",articleId:ARTICLE,kind:"note",revisionId:"rev-1",note:"Kendi kaynak notum",createdAt:"2026-10-13T10:00:00Z",version:0,sourceTexts:{[BLOCK]:"Bugün saatte buluşalım."},fragments:[{blockId:BLOCK,start:6,end:12,quote:"saatte",before:"Bugün ",after:" buluşalım."}]});
 personalOf(backend.state.member,"reader-2").marks.push({id:"other-note",articleId:ARTICLE,kind:"note",revisionId:"rev-1",note:"Başkasının özel notu",createdAt:"2026-10-13T10:00:00Z",version:0,fragments:[]});
 render(<AuthProvider><article id="reading-content"><p data-reading-anchor={BLOCK}>Bugün saatlerde buluşalım.</p></article><ReadingTools readOnly articleId="sample" contentRootId="reading-content" server={server}/></AuthProvider>);await act(settle);
 expect(screen.getByText("Kendi kaynak notum")).toBeTruthy();
 expect(screen.queryByText("Başkasının özel notu")).toBeNull();
 expect(screen.queryByRole("group",{name:"Metin işaretleme araçları"})).toBeNull();
 expect(screen.getByRole("button",{name:"Notu düzenle"}).hasAttribute("disabled")).toBe(true);
 expect(backend.state.calls.some(c=>c.path===`/studio/articles/${ARTICLE}/reading-notes`)).toBe(true);
 expect(backend.state.calls.some(c=>c.method!=="GET"&&c.path.includes("annotations"))).toBe(false);
 expect(screen.getByText("Kaynak değişti")).toBeTruthy();
});
