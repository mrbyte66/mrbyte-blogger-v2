import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotesPanel } from "../components/builder/NotesPanel";
import { WordGoal } from "../components/builder/WordGoal";
import { api, ApiError } from "../lib/api/http";
import { articleWords, liveWords } from "../lib/studio/writing";
import type { Article } from "../lib/content";

vi.mock("../lib/api/http", async (original) => ({ ...await original<typeof import("../lib/api/http")>(), api: vi.fn() }));
const call = vi.mocked(api);

const block = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
const article: Article = {
  id: "a1", version: 4, slug: "sessizlik", title: "Sessizlik", category: "Deneme", eyebrow: "", excerpt: "", minutes: 1,
  paragraphs: ["Ilk paragraf burada.", "Ikinci paragraf biraz daha uzun."], blockIds: { paragraphs: block },
};
const note = (over: Partial<Record<string, unknown>> = {}) => ({ id: "n1", blockId: null, body: "Girişi kısalt.", resolved: false, createdAt: "2026-10-12T09:30:00Z", updatedAt: "2026-10-12T09:30:00Z", ...over });
const ok = <T,>(data: T, status = 200) => ({ data, etag: null, status });

describe("yazı araçları: saf hesaplar", () => {
  it("sayar: paragraflardaki kelimeleri, boşlukları yok sayarak", () => {
    expect(articleWords({ paragraphs: ["bir iki  üç", "  ", "dört"] })).toBe(4);
  });
  it("bugünkü sayıya yalnızca kaydedilmemiş net farkı ekler, hiçbir zaman eksiye düşmez", () => {
    expect(liveWords(100, 40, 55)).toBe(115);
    expect(liveWords(100, 40, 30)).toBe(90);
    expect(liveWords(5, 40, 0)).toBe(0);
  });
});

describe("özel notlar", () => {
  beforeEach(() => { call.mockReset(); });

  it("notları konumlarıyla listeler; çözülenler ayrı, bağı kopmuş olan açıkça belirtilir", async () => {
    call.mockResolvedValueOnce(ok({ items: [
      note(),
      note({ id: "n2", blockId: block[1], body: "Bu cümle ağır." }),
      note({ id: "n3", blockId: "99999999-9999-4999-8999-999999999999", body: "Silinen paragraf için." }),
      note({ id: "n4", resolved: true, body: "Yazım hatası düzeltildi." }),
    ] }));
    render(<NotesPanel article={article} field="title" />);
    expect(await screen.findByText("Girişi kısalt.")).toBeTruthy();
    expect(screen.getByText(/Paragraf 2 ·/)).toBeTruthy();
    expect(screen.getByText(/Bağlı paragraf kaldırıldı ·/)).toBeTruthy();
    expect(screen.getByText("Çözülenler · 1")).toBeTruthy();
    expect(call).toHaveBeenCalledWith("GET", "/studio/articles/a1/notes");
  });

  it("seçili paragrafa bağlı not ekler ve sayaçla sınırı gösterir", async () => {
    call.mockResolvedValueOnce(ok({ items: [] }));
    render(<NotesPanel article={article} field="paragraph-1" />);
    expect(await screen.findByText(/Henüz not yok/)).toBeTruthy();
    const input = screen.getByLabelText("Paragraf 2 için not") as HTMLTextAreaElement;
    expect((screen.getByRole("button", { name: "Notu ekle" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, { target: { value: "Bu paragrafı böl." } });
    expect(screen.getByText("17 / 1000")).toBeTruthy();
    call.mockResolvedValueOnce(ok(note({ id: "n9", blockId: block[1], body: "Bu paragrafı böl." }), 201));
    fireEvent.click(screen.getByRole("button", { name: "Notu ekle" }));
    expect(await screen.findByText("Bu paragrafı böl.")).toBeTruthy();
    expect(call).toHaveBeenLastCalledWith("POST", "/studio/articles/a1/notes", { body: { body: "Bu paragrafı böl.", blockId: block[1] } });
    expect(input.value).toBe("");
  });

  it("başlık seçiliyken notu tüm yazıya bağlar", async () => {
    call.mockResolvedValueOnce(ok({ items: [] }));
    render(<NotesPanel article={article} field="title" />);
    await screen.findByText(/Henüz not yok/);
    fireEvent.change(screen.getByLabelText("Tüm yazı için not"), { target: { value: "Başlık daha kısa olsun." } });
    call.mockResolvedValueOnce(ok(note({ id: "n10", body: "Başlık daha kısa olsun." }), 201));
    fireEvent.click(screen.getByRole("button", { name: "Notu ekle" }));
    await screen.findByText("Başlık daha kısa olsun.");
    expect(call).toHaveBeenLastCalledWith("POST", "/studio/articles/a1/notes", { body: { body: "Başlık daha kısa olsun.", blockId: null } });
  });

  it("not eklenemezse metni korur ve nedenini söyler", async () => {
    call.mockResolvedValueOnce(ok({ items: [] }));
    render(<NotesPanel article={article} field="paragraph-0" />);
    await screen.findByText(/Henüz not yok/);
    fireEvent.change(screen.getByLabelText("Paragraf 1 için not"), { target: { value: "Kaybolmasın." } });
    call.mockRejectedValueOnce(new ApiError(409, "NOTE_LIMIT", "Bu yazı için en fazla 200 not tutulabilir."));
    fireEvent.click(screen.getByRole("button", { name: "Notu ekle" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("en fazla 200 not");
    expect((screen.getByLabelText("Paragraf 1 için not") as HTMLTextAreaElement).value).toBe("Kaybolmasın.");
  });

  it("notu çözüldü yapar, yeniden açar ve siler", async () => {
    call.mockResolvedValueOnce(ok({ items: [note()] }));
    render(<NotesPanel article={article} field="title" />);
    await screen.findByText("Girişi kısalt.");
    call.mockResolvedValueOnce(ok(note({ resolved: true })));
    fireEvent.click(screen.getByRole("button", { name: "Notu çözüldü yap" }));
    expect(await screen.findByText("Çözülenler · 1")).toBeTruthy();
    expect(call).toHaveBeenLastCalledWith("PATCH", "/studio/articles/a1/notes/n1", { body: { resolved: true } });
    fireEvent.click(screen.getByText("Çözülenler · 1"));
    const done = screen.getByText("Girişi kısalt.").closest("li") as HTMLElement;
    call.mockResolvedValueOnce(ok(undefined, 204));
    fireEvent.click(within(done).getByRole("button", { name: "Notu sil" }));
    await waitFor(() => expect(screen.queryByText("Girişi kısalt.")).toBeNull());
    expect(call).toHaveBeenLastCalledWith("DELETE", "/studio/articles/a1/notes/n1");
  });

  it("yüklenemezse hatayı gösterir ve yeniden denemeye izin verir", async () => {
    call.mockRejectedValueOnce(new ApiError(503, "SERVICE_UNAVAILABLE", "Sunucu şu anda yanıt veremiyor."));
    render(<NotesPanel article={article} field="title" />);
    expect((await screen.findByText(/Notlar yüklenemedi/)).textContent).toContain("Notlar yüklenemedi");
    call.mockResolvedValueOnce(ok({ items: [note()] }));
    fireEvent.click(screen.getByRole("button", { name: "Yeniden dene" }));
    expect(await screen.findByText("Girişi kısalt.")).toBeTruthy();
  });

  it("henüz kaydedilmemiş yazıda API'ye gitmez, önce kaydetmeyi söyler", () => {
    render(<NotesPanel article={{ ...article, id: undefined }} field="title" />);
    expect(screen.getByText(/ilk kez kaydedildikten sonra/)).toBeTruthy();
    expect(call).not.toHaveBeenCalled();
  });
});

describe("günlük kelime hedefi", () => {
  beforeEach(() => { call.mockReset(); });
  /** A tiny stateful server: a saved goal is what the next read returns. */
  const serve = (words: number, goal: number, version = 7) => {
    let state = { goal, version };
    call.mockImplementation(async (method: string, path: string, options?: { body?: unknown }) => {
      if (path === "/studio/writing/today") return ok({ date: "2026-10-14", words });
      if (path === "/studio/site" && method === "GET") return ok({ dailyWordGoal: state.goal, version: state.version });
      if (path === "/studio/site" && method === "PATCH") { state = { goal: (options?.body as { dailyWordGoal?: number } | undefined)?.dailyWordGoal ?? state.goal, version: state.version + 1 }; return ok({ dailyWordGoal: state.goal, version: state.version }); }
      throw new Error(`beklenmeyen çağrı ${method} ${path}`);
    });
  };

  it("bugünkü kelimeleri hedefle birlikte gösterir ve açık taslaktaki farkı ekler", async () => {
    serve(120, 500);
    const saved = { ...article, paragraphs: ["bir iki üç"] };
    const current = { ...article, paragraphs: ["bir iki üç dört beş"] };
    render(<WordGoal saved={saved} current={current} />);
    expect(await screen.findByText("122 / 500")).toBeTruthy();
    expect(screen.getByRole("img", { name: /yüzde 24/ })).toBeTruthy();
    expect(screen.getByText("günlük kelime hedefi")).toBeTruthy();
  });

  it("hedef tamamlanınca bunu söyler", async () => {
    serve(640, 500);
    render(<WordGoal />);
    expect(await screen.findByText("640 / 500")).toBeTruthy();
    expect(screen.getByText("bugünkü hedef tamam")).toBeTruthy();
  });

  it("hedef kapalıyken yalnızca bugünkü kelimeleri gösterir", async () => {
    serve(35, 0);
    render(<WordGoal />);
    expect(await screen.findByText("35 kelime")).toBeTruthy();
    expect(screen.getByText("bugün yazılan · hedef kapalı")).toBeTruthy();
  });

  it("hedefi sürüm koşuluyla kaydeder", async () => {
    serve(120, 500);
    render(<WordGoal />);
    fireEvent.click(await screen.findByRole("button", { name: /120 \/ 500/ }));
    fireEvent.change(screen.getByLabelText("Günlük hedef (kelime)"), { target: { value: "800" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Kaydet" })); });
    expect(call).toHaveBeenCalledWith("PATCH", "/studio/site", { ifMatch: 7, body: { dailyWordGoal: 800 } });
    expect(await screen.findByText("120 / 800")).toBeTruthy();
  });

  it("sınır dışı değeri sunucuya göndermeden reddeder", async () => {
    serve(120, 500);
    render(<WordGoal />);
    fireEvent.click(await screen.findByRole("button", { name: /120 \/ 500/ }));
    fireEvent.change(screen.getByLabelText("Günlük hedef (kelime)"), { target: { value: "30000" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect((await screen.findByRole("alert")).textContent).toContain("0 ile 20.000");
    expect(call.mock.calls.some(([method]) => method === "PATCH")).toBe(false);
  });
});
