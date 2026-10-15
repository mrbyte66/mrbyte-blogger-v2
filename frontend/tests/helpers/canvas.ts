import { act, fireEvent, screen } from "@testing-library/react";
import { documentEvent, parseDocumentDraft, type DocumentDraft } from "../../lib/builder/document-protocol";
import { documentText, inlineEditEvent } from "../../lib/builder/inline-edit";

/**
 * Writing in the canvas happens inside the preview iframe and travels as messages. These helpers play
 * the iframe's part: `writeCanvas` sends the same inline-edit message the canvas editor posts, and
 * `readCanvas` returns the document the Studio last pushed into the frame.
 */
const posted = new WeakMap<Window, DocumentDraft>();

// Record what the Studio posts into every preview frame (jsdom frames are real child windows).
const original = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "contentWindow");
if (original?.get && !(HTMLIFrameElement.prototype as unknown as { __canvasRecorder?: boolean }).__canvasRecorder) {
  (HTMLIFrameElement.prototype as unknown as { __canvasRecorder?: boolean }).__canvasRecorder = true;
  Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
    configurable: true,
    get(this: HTMLIFrameElement) {
      const frame = original.get!.call(this) as (Window & { __recording?: boolean }) | null;
      if (frame && !frame.__recording) {
        frame.__recording = true;
        const post = frame.postMessage.bind(frame) as (...args: unknown[]) => void;
        (frame as unknown as { postMessage: (...args: unknown[]) => void }).postMessage = (...args: unknown[]) => {
          const data = args[0] as { type?: string; document?: unknown } | undefined;
          if (data?.type === documentEvent) {
            const draft = parseDocumentDraft(data.document);
            if (draft) posted.set(frame, draft); else posted.delete(frame);
          }
          post(...args);
        };
      }
      return frame;
    },
  });
}

function frame(): HTMLIFrameElement {
  return screen.getByTitle("Taslak tema canlı önizleme") as HTMLIFrameElement;
}

/** The document the Studio currently shows in the canvas. */
export function readCanvas(): DocumentDraft {
  const target = frame().contentWindow!;
  const draft = posted.get(target);
  if (!draft) throw new Error("Tuvale henüz bir belge gönderilmedi.");
  return draft;
}

/** Title of the article or series currently in the canvas. */
export function canvasTitle(): string {
  const draft = readCanvas();
  return draft.kind === "article" ? draft.article.title : draft.series.title;
}

/** Types into a canvas field (title, excerpt, summary, paragraph-N) as the in-frame editor would. */
export function writeCanvas(field: string, value: string) {
  const draft = readCanvas();
  const text = documentText(draft, field);
  if (!text) throw new Error(`Tuvalde düzenlenebilir alan yok: ${field}`);
  const id = draft.kind === "article" ? draft.article.slug : draft.series.slug;
  const edit = { scope: "document" as const, id, field, value, previous: text.value };
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { type: inlineEditEvent, edit }, source: frame().contentWindow, origin: window.location.origin }));
  });
}

/** Open a secondary writing control through its compact menu. */
export function writingTool(name:string) {
  if (!screen.queryByRole("button",{name})) {
    if (!screen.queryByRole("tab",{name:"Ayarlar"})) fireEvent.click(screen.getByRole("button",{name:"İçindekiler"}));
    fireEvent.click(screen.getByRole("tab",{name:"Ayarlar"}));
  }
  return screen.getByRole("button",{name});
}
export function discardWriting() {
  fireEvent.click(screen.getByLabelText("İçerik işlemleri"));
  fireEvent.click(screen.getByRole("button",{name:"Kaydedilmemiş değişiklikleri geri al"}));
}
