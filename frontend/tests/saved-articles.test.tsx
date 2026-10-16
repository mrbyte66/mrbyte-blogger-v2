import { useState as requireState, type ReactNode } from "react";
import { act, fireEvent, render as baseRender, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../components/auth/AuthProvider";
import { SiteDataValues, type ContentState } from "../components/data/SiteData";
import { EngagementProvider } from "../components/engagement/EngagementProvider";
import { SavedLibraryPage } from "../components/saved/SavedLibraryPage";
import { ArticleCard } from "../components/ArticleCard";
import { SavedProvider, useSavedLibrary } from "../components/saved/SavedProvider";
import { SaveArticleButton } from "../components/saved/SaveArticleButton";
import { createWorkspace } from "../lib/builder/model";
import { articles as fixtures, type Article } from "../lib/content";
import { fakeBackend, settle } from "./support/fake-backend";
import { personalOf } from "./support/fake-member-api";

const articles: Article[] = fixtures.slice(0, 3).map((article, index) => ({ ...article, id: `20000000-0000-4000-8000-00000000000${index + 1}`, status: "published", stats: { views: 0, claps: 0, saves: 0 } }));
let backend: ReturnType<typeof fakeBackend>;

function Site({ children }: { children: ReactNode }) {
  const content: ContentState = { articles, series: [], ready: true, error: null };
  return <SiteDataValues content={content} workspace={{ workspace: createWorkspace(), save: () => false, ready: true, storageError: null }}>
    <AuthProvider><EngagementProvider><SavedProvider>{children}</SavedProvider></EngagementProvider></AuthProvider>
  </SiteDataValues>;
}
async function render(ui: ReactNode) { const result = baseRender(<Site>{ui}</Site>); await act(settle); return result; }
async function click(element: HTMLElement) { await act(async () => { fireEvent.click(element); await settle(); }); }
function SignOut() { const { signOut } = useAuth(); return <button onClick={() => void signOut()}>Çıkış</button>; }
const me = () => personalOf(backend.state.member, "member-1");
const bookmarks = () => me().bookmarks;
const collections = () => me().collections;

beforeEach(() => {
  localStorage.clear();
  backend = fakeBackend({ signedIn: { id: "member-1", name: "Üye", email: "member@example.com" } });
  for (const article of articles) backend.state.member.publicArticles.set(article.id!, { slug: article.slug, stats: { views: 0, claps: 0, saves: 0 } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("keeps the new account library ready when the prior account save finishes late", async () => {
  function Ready() { const library = useSavedLibrary(); return <output data-testid="ready">{String(library.ready)}</output>; }
  await render(<><SaveArticleButton slug={articles[0].slug} title={articles[0].title} /><Ready /></>);
  const original = backend.fetchMock.getMockImplementation()!;
  let resolveOld!: (response: Response) => void;
  let response!: Response;
  const held = new Promise<Response>(resolve => { resolveOld = resolve; });
  backend.fetchMock.mockImplementation((input, init) => {
    const result = original(input, init);
    if (init?.method === "PUT" && String(input).includes("/me/bookmarks/")) {
      void result.then(value => { response = value; }); return held;
    }
    return result;
  });
  await click(screen.getByRole("button", { name: `Yazıyı kaydet: ${articles[0].title}` }));
  backend.switchTo({ id: "member-2", email: "other@example.test" });
  await act(async () => { window.dispatchEvent(new Event("focus")); await settle(); });
  expect(screen.getByTestId("ready").textContent).toBe("true");
  await act(async () => { resolveOld(response); await settle(); });
  expect(screen.getByTestId("ready").textContent).toBe("true");
  expect(personalOf(backend.state.member, "member-2").bookmarks).toEqual([]);
});

describe("member bookmark controls", () => {
  it("saves to Genel without opening the article, moves, creates collections and removes", async () => {
    const open = vi.fn();
    const { container } = await render(<ArticleCard article={articles[0]} onOpen={open} />);
    await click(screen.getByRole("button", { name: `Yazıyı kaydet: ${articles[0].title}` }));
    expect(open).not.toHaveBeenCalled();
    expect(container.querySelector("button button")).toBeNull();
    const genel = collections().find((c) => c.isDefault)!;
    expect(genel.name).toBe("Genel");
    expect(bookmarks()).toEqual([expect.objectContaining({ articleId: articles[0].id, collectionId: genel.id })]);
    expect(screen.getByRole("button", { name: `Kaydı yönet: ${articles[0].title}` }).textContent).toContain("1");

    fireEvent.click(screen.getByRole("button", { name: "Yeni koleksiyon" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Koleksiyon adı"));
    fireEvent.change(screen.getByLabelText("Koleksiyon adı"), { target: { value: "Kişisel gelişim" } });
    await click(screen.getByRole("button", { name: "Oluştur ve taşı" }));
    const custom = collections().find((c) => c.name === "Kişisel gelişim")!;
    expect(bookmarks()[0].collectionId).toBe(custom.id);
    expect(backend.state.calls.find((c) => c.method === "POST" && c.path === "/me/collections")?.headers["Idempotency-Key"]).toBeTruthy();

    await click(screen.getByRole("button", { name: `Kaydı yönet: ${articles[0].title}` }));
    fireEvent.change(screen.getByLabelText("Koleksiyon", { exact: true }), { target: { value: genel.id } });
    expect(bookmarks()[0].collectionId).toBe(custom.id);
    await click(screen.getByRole("button", { name: "Taşı" }));
    expect(bookmarks()[0].collectionId).toBe(genel.id);

    await click(screen.getByRole("button", { name: `Kaydı yönet: ${articles[0].title}` }));
    await click(screen.getByRole("button", { name: "Kaydı kaldır" }));
    expect(bookmarks()).toEqual([]);
    expect(localStorage.length).toBe(0);
  });

  it("reports server failures without pretending the record was saved", async () => {
    await render(<SaveArticleButton slug={articles[0].slug} title={articles[0].title} />);
    backend.state.member.publicArticles.delete(articles[0].id!);
    await click(screen.getByRole("button", { name: `Yazıyı kaydet: ${articles[0].title}` }));
    expect(screen.getByRole("alert").textContent).toContain("Bulunamadı");
    expect(bookmarks()).toEqual([]);
    expect(screen.getByRole("button", { name: `Yazıyı kaydet: ${articles[0].title}` }).getAttribute("aria-pressed")).toBe("false");
  });

  it("never allows Studio preview to save and asks guests to sign in", async () => {
    await render(<SaveArticleButton slug={articles[0].slug} title={articles[0].title} preview />);
    expect(screen.queryByRole("button")).toBeNull();
    backend.switchTo(null);
    baseRender(<Site><SaveArticleButton slug={articles[1].slug} title={articles[1].title} /></Site>);
    await act(settle);
    expect(screen.getByRole("button", { name: `Giriş yap ve yazıyı kaydet: ${articles[1].title}` })).toBeTruthy();
    expect(backend.state.calls.filter((c) => c.path.startsWith("/me/bookmarks") && c.method !== "GET")).toEqual([]);
  });
});

describe("library page", () => {
  it("lists, searches and sorts saved writing; signing out hides everything", async () => {
    me().collections.push({ id: "c-default", name: "Genel", isDefault: true, version: 0 }, { id: "c-private", name: "Özel koleksiyon", isDefault: false, version: 0 });
    me().bookmarks.push(
      { articleId: articles[1].id!, collectionId: "c-private", savedAt: "2026-10-01T10:00:00Z", version: 0 },
      { articleId: articles[0].id!, collectionId: "c-default", savedAt: "2026-10-02T10:00:00Z", version: 0 });
    const { container } = await render(<><SavedLibraryPage /><SignOut /></>);
    expect(screen.getByRole("button", { name: "Özel koleksiyon 1" })).toBeTruthy();
    const order = () => Array.from(container.querySelectorAll(".saved-item .article-card-title")).map((el) => el.textContent);
    expect(order()).toEqual([articles[0].title, articles[1].title]);
    fireEvent.change(screen.getByLabelText("Sıralama"), { target: { value: "title" } });
    expect(order()).toEqual([articles[0].title, articles[1].title].sort((a, b) => a.localeCompare(b, "tr")));
    fireEvent.change(screen.getByLabelText("Kitaplıkta ara"), { target: { value: "no-match-1234" } });
    expect(screen.getByRole("heading", { name: "Aradığın satır henüz burada değil." })).toBeTruthy();
    await click(screen.getByRole("button", { name: "Çıkış" }));
    expect(screen.queryByRole("button", { name: "Özel koleksiyon 1" })).toBeNull();
    expect(screen.queryByText(articles[0].title)).toBeNull();
  });

  it("keeps hidden writing as an anonymous record that can be removed", async () => {
    me().collections.push({ id: "c-default", name: "Genel", isDefault: true, version: 0 });
    me().bookmarks.push({ articleId: articles[2].id!, collectionId: "c-default", savedAt: "2026-10-01T10:00:00Z", version: 0 });
    backend.state.member.publicArticles.delete(articles[2].id!);
    await render(<SavedLibraryPage />);
    expect(screen.getByRole("heading", { name: "Yazı şu anda erişilemiyor" })).toBeTruthy();
    expect(screen.queryByText(articles[2].title)).toBeNull();
    await click(screen.getByRole("button", { name: "Kaydı kaldır" }));
    expect(bookmarks()).toEqual([]);
  });

  it("renames and deletes a custom collection; its writing returns to Genel", async () => {
    me().collections.push({ id: "c-default", name: "Genel", isDefault: true, version: 0 }, { id: "c-old", name: "Eski ad", isDefault: false, version: 0 });
    me().bookmarks.push({ articleId: articles[0].id!, collectionId: "c-old", savedAt: "2026-10-01T10:00:00Z", version: 0 });
    await render(<SavedLibraryPage />);
    fireEvent.click(screen.getByRole("button", { name: "Eski ad 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Koleksiyonu düzenle" }));
    fireEvent.change(screen.getByLabelText("Koleksiyon adı"), { target: { value: "Yeni ad" } });
    await click(screen.getByRole("button", { name: "Kaydet" }));
    expect(collections().find((c) => c.id === "c-old")?.name).toBe("Yeni ad");
    fireEvent.click(screen.getByRole("button", { name: "Yeni ad 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Koleksiyonu düzenle" }));
    await click(screen.getByRole("button", { name: "Koleksiyonu kaldır" }));
    expect(collections().map((c) => c.id)).toEqual(["c-default"]);
    expect(bookmarks()[0].collectionId).toBe("c-default");
  });
});

describe("account change (#5)", () => {
  it.each(["account-switch", "logout-and-return"])("clears private library drafts and filters on %s", async (transition) => {
    me().collections.push({ id: "alice-default", name: "Genel", isDefault: true, version: 0 }, { id: "alice-private", name: "Alice özel koleksiyonu", isDefault: false, version: 0 });
    me().bookmarks.push({ articleId: articles[0].id!, collectionId: "alice-private", savedAt: "2026-10-01T10:00:00Z", version: 0 });
    const bob = personalOf(backend.state.member, "bob-member");
    bob.collections.push({ id: "bob-default", name: "Genel", isDefault: true, version: 0 });
    bob.bookmarks.push({ articleId: articles[1].id!, collectionId: "bob-default", savedAt: "2026-10-02T10:00:00Z", version: 0 });
    await render(<><SavedLibraryPage /><SignOut /></>);
    fireEvent.click(screen.getByRole("button", { name: "Alice özel koleksiyonu 1" }));
    fireEvent.change(screen.getByLabelText("Kitaplıkta ara"), { target: { value: articles[0].title } });
    fireEvent.change(screen.getByLabelText("Sıralama"), { target: { value: "title" } });
    fireEvent.click(screen.getByRole("button", { name: "Koleksiyonu düzenle" }));
    expect(screen.getByLabelText("Koleksiyon adı")).toHaveProperty("value", "Alice özel koleksiyonu");
    if (transition === "logout-and-return") {
      await click(screen.getByRole("button", { name: "Çıkış" }));
      expect(screen.queryByLabelText("Koleksiyon adı")).toBeNull();
      backend.switchTo({ id: "member-1", name: "Üye", email: "member@example.com" });
    } else {
      backend.switchTo({ id: "bob-member", name: "Bob", email: "bob@example.com" });
    }
    // The session changed in another tab/device: AuthProvider re-reads it on focus.
    await act(async () => { window.dispatchEvent(new Event("focus")); await settle(); });
    const expected = transition === "account-switch" ? articles[1] : articles[0];
    expect(screen.getByText(expected.title)).toBeTruthy();
    expect(screen.queryByLabelText("Koleksiyon adı")).toBeNull();
    expect(screen.getByLabelText("Kitaplıkta ara")).toHaveProperty("value", "");
    expect(screen.getByLabelText("Sıralama")).toHaveProperty("value", "saved");
    expect(screen.getByRole("button", { name: "Tümü 1" }).getAttribute("aria-pressed")).toBe("true");
    expect(me().bookmarks).toHaveLength(1);
    expect(bob.bookmarks).toHaveLength(1);
  });

  it("keeps the library tools when the same account's profile changes", async () => {
    me().collections.push({ id: "alice-default", name: "Genel", isDefault: true, version: 0 });
    me().bookmarks.push({ articleId: articles[0].id!, collectionId: "alice-default", savedAt: "2026-10-01T10:00:00Z", version: 0 });
    await render(<SavedLibraryPage />);
    fireEvent.change(screen.getByLabelText("Kitaplıkta ara"), { target: { value: "arama" } });
    backend.switchTo({ id: "member-1", name: "Yeni ad", email: "member@example.com" });
    await act(async () => { window.dispatchEvent(new Event("focus")); await settle(); });
    expect(screen.getByLabelText("Kitaplıkta ara")).toHaveProperty("value", "arama");
  });
});

describe("library V1.1 interactions", () => {
  function savedPair() {
    me().collections.push({ id:"c-a",name:"A",isDefault:true,version:0 },{ id:"c-b",name:"B",isDefault:false,version:0 });
    me().bookmarks.push({ articleId:articles[0].id!,collectionId:"c-a",savedAt:"2026-10-01T10:00:00Z",version:0 });
  }
  it("moves a dragged card to a collection via the server and can undo", async () => {
    savedPair(); const { container } = await render(<SavedLibraryPage />);
    const transfer = { setData:vi.fn(),getData:()=>articles[0].id!,effectAllowed:"",dropEffect:"" };
    fireEvent.dragStart(container.querySelector(".library-entry")!,{ dataTransfer:transfer });
    await act(async () => { fireEvent.drop(screen.getByRole("button",{ name:"B 0" }),{ dataTransfer:transfer });await settle(); });
    expect(bookmarks()[0].collectionId).toBe("c-b");
    await click(screen.getByRole("button",{ name:"Geri al" }));
    expect(bookmarks()[0].collectionId).toBe("c-a");
  });
  it("retains a failed move and does not report success or an undo", async () => {
    savedPair(); await render(<SavedLibraryPage />);
    const original = backend.fetchMock.getMockImplementation()!;
    backend.fetchMock.mockImplementation((input,init) => init?.method === "PUT" && String(input).includes("/me/bookmarks/") ? Promise.resolve(new Response(JSON.stringify({code:"UNAVAILABLE",title:"Taşınamadı"}),{status:503})) : original(input,init));
    fireEvent.click(screen.getByLabelText(`Kaydı yönet: ${articles[0].title}`));
    await act(async () => { fireEvent.change(screen.getByLabelText(`${articles[0].title} için koleksiyon`),{target:{value:"c-b"}});await settle(); });
    expect(bookmarks()[0].collectionId).toBe("c-a");
    expect(screen.getByRole("alert").textContent).toContain("Taşınamadı");
    expect(screen.queryByRole("button",{name:"Geri al"})).toBeNull();
  });
  it("removes and restores to the original collection", async () => {
    savedPair(); await render(<SavedLibraryPage />);
    fireEvent.click(screen.getByLabelText(`Kaydı yönet: ${articles[0].title}`));
    await click(screen.getByRole("button",{ name:"Kitaplıktan kaldır" }));
    expect(bookmarks()).toHaveLength(0);
    await click(screen.getByRole("button",{name:"Geri al"}));
    expect(bookmarks()).toEqual([expect.objectContaining({articleId:articles[0].id,collectionId:"c-a"})]);
  });
  it("keeps compact view and query when the same provider returns to the page", async () => {
    savedPair();
    function Return() { const [visible,setVisible] = requireState(true); return <><button onClick={()=>setVisible(v=>!v)}>Sayfayı değiştir</button>{visible && <SavedLibraryPage />}</>; }
    const {container} = await render(<Return />);
    fireEvent.click(screen.getByRole("button",{name:"Kompakt liste"}));
    fireEvent.change(screen.getByLabelText("Kitaplıkta ara"),{target:{value:"Yapay"}});
    fireEvent.click(screen.getByRole("button",{name:"Sayfayı değiştir"}));
    fireEvent.click(screen.getByRole("button",{name:"Sayfayı değiştir"}));
    expect(screen.getByLabelText("Kitaplıkta ara")).toHaveProperty("value","Yapay");
    expect(container.querySelector(".library-list")).toBeTruthy();
  });
});

it("loads the next batch and jumps to a title outside the current filter", async () => {
  const extra: Article[] = Array.from({length:30},(_,i)=>({...articles[0],id:`20000000-0000-4000-8000-${String(100+i).padStart(12,"0")}`,slug:`arsiv-${i}`,title:`Arşiv ${String(i).padStart(2,"0")}`}));
  const native = HTMLElement.prototype.scrollIntoView; const scrolled=vi.fn(); HTMLElement.prototype.scrollIntoView=scrolled;
  vi.stubGlobal("matchMedia",()=>({matches:true})); articles.push(...extra);
  try {
    me().collections.push({id:"c-default",name:"Genel",isDefault:true,version:0});
    for (const [i,a] of extra.entries()) { backend.state.member.publicArticles.set(a.id!,{slug:a.slug,stats:{views:0,claps:0,saves:0}});me().bookmarks.push({articleId:a.id!,collectionId:"c-default",savedAt:new Date(Date.UTC(2026,0,1,0,0,i)).toISOString(),version:0}); }
    const {container}=await render(<SavedLibraryPage />);
    expect(container.querySelectorAll(".library-entry")).toHaveLength(24);
    await click(screen.getByRole("button",{name:/Daha fazla göster/}));
    expect(container.querySelectorAll(".library-entry")).toHaveLength(30);
    fireEvent.change(screen.getByLabelText("Kitaplıkta ara"),{target:{value:"Arşiv 29"}});
    expect(container.querySelectorAll(".library-entry")).toHaveLength(1);
    const details=container.querySelector<HTMLDetailsElement>(".library-quick")!;
    await act(async()=>{details.open=true;fireEvent(details,new Event("toggle"));await settle();});
    fireEvent.change(screen.getByLabelText("Koleksiyon veya yazı ara"),{target:{value:"Arşiv 00"}});
    await click(screen.getByRole("button",{name:"Arşiv 00"}));
    expect(screen.getByLabelText("Kitaplıkta ara")).toHaveProperty("value","");
    expect(container.querySelector(`#saved-${extra[0].id}`)).toBeTruthy();
    expect(scrolled).toHaveBeenCalled(); expect(details.open).toBe(false);
  } finally { articles.splice(3); HTMLElement.prototype.scrollIntoView=native; }
});

it("retains this account's last loaded library when a refresh fails",async()=>{
 me().collections.push({id:"c-default",name:"Genel",isDefault:true,version:0});
 me().bookmarks.push({articleId:articles[0].id!,collectionId:"c-default",savedAt:"2026-10-01T10:00:00Z",version:0});
 await render(<SavedLibraryPage />);
 const original=backend.fetchMock.getMockImplementation()!;
 backend.fetchMock.mockImplementation((input,init)=>String(input).includes("/me/collections") ? Promise.resolve(new Response(JSON.stringify({code:"UNAVAILABLE",title:"Bağlantı kesildi"}),{status:503})) : original(input,init));
 await act(async()=>{window.dispatchEvent(new Event("focus"));await settle();});
 expect(screen.getByRole("alert").textContent).toContain("Bağlantı kesildi");
 expect(screen.getByText(articles[0].title)).toBeTruthy();
});


it("pins the quick index, keeps it through jumps and route return, and unpins it", async () => {
  vi.stubGlobal("matchMedia", () => ({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
  const native = HTMLElement.prototype.scrollIntoView; HTMLElement.prototype.scrollIntoView = vi.fn();
  try {
    me().collections.push({id:"c-default",name:"Genel",isDefault:true,version:0});
    me().bookmarks.push({articleId:articles[0].id!,collectionId:"c-default",savedAt:"2026-10-01T10:00:00Z",version:0});
    function Return() { const [visible,setVisible] = requireState(true); return <><button onClick={()=>setVisible(v=>!v)}>Sayfayı değiştir</button>{visible && <SavedLibraryPage />}</>; }
    const {container} = await render(<Return />);
    const details=container.querySelector<HTMLDetailsElement>(".library-quick")!;
    await act(async()=>{details.open=true;fireEvent(details,new Event("toggle"));await settle();});
    await click(screen.getByRole("button",{name:"Hızlı listeyi sola sabitle"}));
    expect(screen.getByRole("complementary",{name:"Sabit hızlı liste"})).toBeTruthy();
    await click(screen.getByRole("button",{name:articles[0].title}));
    expect(screen.getByRole("complementary")).toBeTruthy();
    fireEvent.pointerDown(document.body); fireEvent.keyDown(document,{key:"Escape"});
    expect(screen.getByRole("complementary")).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Sayfayı değiştir"}));
    fireEvent.click(screen.getByRole("button",{name:"Sayfayı değiştir"}));
    expect(screen.getByRole("complementary")).toBeTruthy();
    await click(screen.getByRole("button",{name:"Hızlı listeyi ayır"}));
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(container.querySelector(".library-quick")).toBeTruthy();
  } finally { HTMLElement.prototype.scrollIntoView = native; }
});


describe("library side reading", () => {
  function seedPreview() {
    me().collections.push({id:"c-default",name:"Genel",isDefault:true,version:0});
    for (const a of articles.slice(0,2)) me().bookmarks.push({articleId:a.id!,collectionId:"c-default",savedAt:"2026-10-01T10:00:00Z",version:0});
  }
  function desktop() { vi.stubGlobal("matchMedia",()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})); }
  it.each(["grid","list"])("opens real content in %s without recording engagement or changing collections",async(view)=>{
    desktop(); seedPreview(); const {container}=await render(<SavedLibraryPage />);
    if(view==="list") await click(screen.getByRole("button",{name:"Kompakt liste"}));
    const before=JSON.stringify(bookmarks()); backend.fetchMock.mockClear();
    await click(screen.getByRole("button",{name:`Önizle: ${articles[0].title}`}));
    const pane=screen.getByRole("complementary",{name:articles[0].title});
    expect(within(pane).getByText(articles[0].paragraphs[0])).toBeTruthy();
    expect(within(pane).getByRole("link",{name:`Yazıda devam et: ${articles[0].title}`})).toHaveProperty("href",expect.stringContaining(`/yazilar/${articles[0].slug}`));
    expect(container.querySelector(".library-entry.is-previewed")).toBeTruthy();
    expect(JSON.stringify(bookmarks())).toBe(before);
    expect(backend.fetchMock.mock.calls.filter(([,options])=>options?.method && options.method!=="GET")).toHaveLength(0);
    expect(within(pane).queryByText("Alkışla")).toBeNull();
    vi.stubGlobal("innerWidth",1400);
    vi.spyOn(container.querySelector<HTMLElement>(".library-workspace")!,"getBoundingClientRect").mockReturnValue({width:1400} as DOMRect);
    fireEvent.keyDown(screen.getByRole("separator",{name:"Önizleme genişliği"}),{key:"ArrowLeft"});
    expect(container.querySelector("main")?.style.getPropertyValue("--library-preview-width")).toBe("424px");
    await click(screen.getByRole("button",{name:`Önizle: ${articles[1].title}`}));
    expect(screen.queryByRole("heading",{name:articles[0].title})).toBeNull();
    expect(screen.getByRole("heading",{name:articles[1].title})).toBeTruthy();
  });
  it("drops to preview without moving the saved article and rejects foreign drag payloads",async()=>{
    desktop();seedPreview();const {container}=await render(<SavedLibraryPage />);
    const before=JSON.stringify(bookmarks()); const transfer={setData:vi.fn(),getData:()=>articles[0].id!,effectAllowed:"",dropEffect:""};
    fireEvent.drop(container.querySelector(".library-preview-edge")!,{dataTransfer:transfer});
    expect(container.querySelector(".library-preview")).toBeNull();
    fireEvent.dragStart(container.querySelector(".library-entry")!,{dataTransfer:transfer});
    fireEvent.dragOver(container.querySelector(".library-preview-edge")!,{dataTransfer:transfer});
    expect(transfer.dropEffect).toBe("copy");
    await act(async()=>{fireEvent.drop(container.querySelector(".library-preview-edge")!,{dataTransfer:transfer});await settle();});
    expect(screen.getByRole("heading",{name:articles[0].title})).toBeTruthy();expect(JSON.stringify(bookmarks())).toBe(before);
  });
  it("keeps pinned contents and preview together through view changes and route return",async()=>{
    desktop();seedPreview();
    function Return() {const [visible,setVisible]=requireState(true);return <><button onClick={()=>setVisible(v=>!v)}>Sayfayı değiştir</button>{visible && <SavedLibraryPage />}</>;}
    const {container}=await render(<Return />);const details=container.querySelector<HTMLDetailsElement>(".library-quick")!;
    await act(async()=>{details.open=true;fireEvent(details,new Event("toggle"));await settle();});
    await click(screen.getByRole("button",{name:"Hızlı listeyi sola sabitle"}));
    await click(screen.getByRole("button",{name:`Önizle: ${articles[0].title}`}));
    for(const view of ["Kompakt liste","Kart görünümü"]) {
      await click(screen.getByRole("button",{name:view}));
      expect(screen.getByRole("complementary",{name:"Sabit hızlı liste"})).toBeTruthy();
      expect(screen.getByRole("heading",{name:articles[0].title})).toBeTruthy();
    }
    fireEvent.click(screen.getByRole("button",{name:"Sayfayı değiştir"}));fireEvent.click(screen.getByRole("button",{name:"Sayfayı değiştir"}));
    expect(screen.getByRole("heading",{name:articles[0].title})).toBeTruthy();
  });
  it("uses a modal reading sheet on narrow screens and closes with Escape",async()=>{
    vi.stubGlobal("matchMedia",()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));seedPreview();await render(<SavedLibraryPage />);
    await click(screen.getByRole("button",{name:`Önizle: ${articles[0].title}`}));
    const dialog=screen.getByRole("dialog",{name:articles[0].title});expect(dialog.hasAttribute("open")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent(dialog,new Event("cancel",{cancelable:true}));
    await act(async()=>{await new Promise(r=>setTimeout(r,180));});
    expect(screen.queryByRole("dialog")).toBeNull();expect(document.body.style.overflow).not.toBe("hidden");
  });
});


it("clears side-reading context when signing out",async()=>{
 vi.stubGlobal("matchMedia",()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 me().collections.push({id:"c-default",name:"Genel",isDefault:true,version:0});
 me().bookmarks.push({articleId:articles[0].id!,collectionId:"c-default",savedAt:"2026-10-01T10:00:00Z",version:0});
 await render(<><SavedLibraryPage /><SignOut /></>);
 await click(screen.getByRole("button",{name:`Önizle: ${articles[0].title}`}));
 expect(screen.getByRole("heading",{name:articles[0].title})).toBeTruthy();
 await click(screen.getByRole("button",{name:"Çıkış"}));
 expect(screen.queryByRole("heading",{name:articles[0].title})).toBeNull();
 expect(screen.queryByRole("button",{name:"Yazı önizlemesi aç"})).toBeNull();
});


it("associates duplicate collection errors with the name, clears on edit, and keeps names on failure", async () => {
  me().collections.push({ id: "c-default", name: "Genel", isDefault: true, version: 0 });
  await render(<SavedLibraryPage />);
  await click(screen.getByRole("button", { name: "Yeni koleksiyon" }));
  const input = screen.getByRole("textbox", { name: "Koleksiyon adı" });
  fireEvent.change(input, { target: { value: "Genel" } });
  await click(screen.getByRole("button", { name: "Kaydet" }));
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(input).toBe(document.activeElement);
  expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toContain("Başka bir ad seç");
  expect((input as HTMLInputElement).value).toBe("Genel");
  fireEvent.change(input, { target: { value: "Notlar" } });
  expect(input.getAttribute("aria-invalid")).toBe("false");
  expect(screen.queryByRole("alert")).toBeNull();
  await click(screen.getByRole("button", { name: "Kaydet" }));
  expect(collections().some(c => c.name === "Notlar")).toBe(true);
});

it("explains empty collection names without sending a request", async () => {
  await render(<SavedLibraryPage />);
  await click(screen.getByRole("button", { name: "Yeni koleksiyon" }));
  await click(screen.getByRole("button", { name: "Kaydet" }));
  expect(screen.getByRole("alert").textContent).toContain("Koleksiyonuna bir ad ver");
  expect(backend.state.calls.some(c => c.method === "POST" && c.path === "/me/collections")).toBe(false);
});

it("shows duplicate name errors in the article save popover as well", async () => {
  await render(<SaveArticleButton slug={articles[0].slug} title={articles[0].title} />);
  await click(screen.getByRole("button", { name: `Yazıyı kaydet: ${articles[0].title}` }));
  await click(screen.getByRole("button", { name: "Yeni koleksiyon" }));
  const input = screen.getByRole("textbox", { name: "Koleksiyon adı" });
  fireEvent.change(input, { target: { value: "Genel" } });
  await click(screen.getByRole("button", { name: "Oluştur ve taşı" }));
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toContain("Başka bir ad seç");
  expect(input).toBe(document.activeElement);
});
