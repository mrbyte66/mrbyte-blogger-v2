import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { SourceDetails } from "../components/reading/SourceDetails";
import type { ReadingMark } from "../lib/reading/model";
const quote="aynı saatte";
const original="Okuma kulübü her hafta aynı saatte buluşur.";
const start=original.indexOf(quote);
const mark:ReadingMark={id:"note",kind:"note",note:"Takvimime eklemeliyim.",createdAt:"2026-10-19T00:00:00Z",fragments:[{anchorId:"source",start,end:start+quote.length,quote,before:original.slice(0,start),after:original.slice(start+quote.length),sourceText:original}]};

it("explains a removed source with the saved quotation, a reassuring badge and an active action, without a select or prose warning",()=>{
 const reconnect=vi.fn();render(<SourceDetails mark={mark} blocks={[]} onReconnect={reconnect} onMode={vi.fn()}/>);
 expect(screen.getByText("Alıntı yazıda yok")).toBeTruthy();
 expect(screen.getByText("Notun saklı")).toBeTruthy();
 expect(screen.getByText(quote)).toBeTruthy();
 expect(screen.queryByText("Yazıdan çıkarılmış")).toBeNull();
 expect(screen.queryByRole("combobox")).toBeNull();
 expect(screen.queryByText(/Kesin eşleşme/)).toBeNull();
 fireEvent.click(screen.getByRole("button",{name:"Yeni yer seç"}));expect(reconnect).toHaveBeenCalledOnce();
});
it("shows a small before/now diff and keeps both tracking preferences behind a separate affordance",()=>{
 const mode=vi.fn();const {container}=render(<SourceDetails mark={mark} blocks={[{id:"source",text:original.replace("saatte","saatlerde")}]} onMode={mode}/>);
 expect(screen.getByText("Alıntı değişti")).toBeTruthy();
 expect(container.querySelector("del")).toBeTruthy();expect(container.querySelector("ins")).toBeTruthy();
 expect(screen.getByText("Anlamı da değişmiş olabilir.")).toBeTruthy();
 expect(screen.queryByRole("button",{name:"Alıntıyı koru"})).toBeNull();
 fireEvent.click(screen.getByLabelText("Takip tercihini değiştir"));
 fireEvent.click(screen.getByRole("button",{name:"Alıntıyı koru"}));expect(mode).toHaveBeenCalledWith("exact");
 fireEvent.click(screen.getByRole("button",{name:"Takip et"}));expect(mode).toHaveBeenCalledWith("follow");
});
it("stays quiet for a moved source, distinguishes ambiguous matching, and lets a long quotation be expanded",()=>{
 const {rerender}=render(<SourceDetails mark={mark} blocks={[{id:"source",text:"Yeni giriş. "+original}]}/>);
 expect(screen.getByRole("button",{name:"Metni takip etti"}).getAttribute("aria-expanded")).toBe("false");
 expect(screen.queryByText("Önce")).toBeNull();
 rerender(<SourceDetails mark={mark} blocks={[{id:"source",text:original+" "+original}]}/>);
 expect(screen.getByText("Yeri net değil")).toBeTruthy();
 // A changed source also preserves the full first quotation after explicit reconnection.
 const long="Özgün alıntı ".repeat(20);
 rerender(<SourceDetails mark={{...mark,originalQuote:long}} blocks={[]} readOnly/>);
 expect(screen.queryByText(long.trim())).toBeNull();
 fireEvent.click(screen.getByRole("button",{name:"Alıntının tamamı"}));
 expect(screen.getByText(long.trim())).toBeTruthy();
 expect(screen.queryByRole("button",{name:"Yeni yer seç"})).toBeNull();
 expect(screen.queryByLabelText("Takip tercihini değiştir")).toBeNull();
 expect(screen.getByText("Studio önizlemesi")).toBeTruthy();
});

it("keeps the waiting card small and exposes a clear undo after an explicit connection",()=>{
 const {rerender}=render(<SourceDetails mark={mark} blocks={[]} reconnecting onReconnect={vi.fn()}/>);
 expect(screen.getByText("Yeni yer bekleniyor")).toBeTruthy();expect(screen.queryByRole("button",{name:"Yeni yer seç"})).toBeNull();
 const undo=vi.fn();rerender(<SourceDetails mark={mark} blocks={[{id:"source",text:original}]} onUndo={undo}/>);
 expect(screen.getByRole("button",{name:"Bağlandı"})).toBeTruthy();fireEvent.click(screen.getByRole("button",{name:"Geri al"}));expect(undo).toHaveBeenCalledOnce();
});
