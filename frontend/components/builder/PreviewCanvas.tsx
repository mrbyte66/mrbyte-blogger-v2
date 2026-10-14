"use client";

import { useAuth } from "../auth/AuthProvider";
import { inlineEditEvent, parseInlineEdit, type InlineEdit } from "../../lib/builder/inline-edit";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Workspace } from "../../lib/builder/model";
import { isBlockId, isSceneField, parseCanvasRect, parseCaret, type CaretPosition, type SceneField, previewEvents, type CanvasSelection } from "../../lib/builder/preview-protocol";

import { documentEvent, navigateEvent, parseStudioTarget, isDocumentField, type DocumentDraft, type StudioTarget } from "../../lib/builder/document-protocol";

type Props = {
  onSaveRequest?: () => void;
  onHistory?: (direction: -1 | 1) => void;
  document?: DocumentDraft | null;
  onInlineEdit?: (edit: InlineEdit) => void;
  onNavigate?: (target: StudioTarget) => void;
  mobile: boolean;
  workspace: Workspace;
  selection: CanvasSelection;
  onSelect: (id: string, field?: SceneField) => void;
  /** Where the writing caret sits in the frame (document editing only). */
  onCaret?: (caret: CaretPosition) => void;
  /** The author pressed empty space inside the frame. */
  onPointer?: () => void;
  /** Changes whenever the Studio replaces the draft from outside the canvas. */
  resetKey?: number;
  /** Where the block chosen in the frame sits on screen (page coordinates), for a settings card beside it. */
  onAnchor?: (rect: DOMRect) => void;
};

export function PreviewCanvas({ mobile, workspace, selection, onSelect, document = null, onNavigate, onInlineEdit, onCaret, onPointer, resetKey = 0, onAnchor, onSaveRequest, onHistory }: Props) {
  const {session,openAuth}=useAuth();
  const [unavailable,setUnavailable]=useState(false);
  const [epoch,setEpoch]=useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [availableHeight, setAvailableHeight] = useState(760);
  const [availableWidth, setAvailableWidth] = useState(600);
  // The frame is laid out at its real size from the first paint; otherwise the page inside jumps once measured.
  const [measured, setMeasured] = useState(false);
  useLayoutEffect(() => {
    const rect = container.current?.getBoundingClientRect();
    if (rect && rect.width > 0) setAvailableWidth(Math.max(1, rect.width));
    if (rect && rect.height > 100) setAvailableHeight(rect.height);
    setMeasured(true);
  }, []);
  const [loaded, setLoaded] = useState(false);
  useEffect(()=>{if(unavailable && session) {setUnavailable(false);setLoaded(false);setEpoch(n=>n+1);} },[session]);
  const serialized = JSON.stringify(workspace);
  const current = useRef({ serialized, selection, workspace, onSaveRequest, onHistory, onSelect, document, onNavigate, onInlineEdit, onCaret, onPointer, onAnchor });
  current.current = { serialized, selection, workspace, onSaveRequest, onHistory, onSelect, document, onNavigate, onInlineEdit, onCaret, onPointer, onAnchor };

  function synchronize() {
    const target = frame.current?.contentWindow;
    const state = current.current;
    target?.postMessage({ type: previewEvents.workspace, workspace: state.serialized }, window.location.origin);
    target?.postMessage({ type: documentEvent, document: state.document }, window.location.origin);
    target?.postMessage({ type: previewEvents.selection, ...state.selection }, window.location.origin);
  }

  useEffect(() => { synchronize(); }, [serialized, document]);
  useEffect(() => {
    if (resetKey) frame.current?.contentWindow?.postMessage({ type: previewEvents.reset }, window.location.origin);
  }, [resetKey]);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: previewEvents.selection, ...selection }, window.location.origin);
  }, [selection.id, selection.request, selection.editing]);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (current.current.selection.editing && current.current.document) {
        if(event.data?.type===previewEvents.save) current.current.onSaveRequest?.();
        if(event.data?.type===previewEvents.undo) current.current.onHistory?.(-1);
        if(event.data?.type===previewEvents.redo) current.current.onHistory?.(1);
      }
      if (event.data?.type === inlineEditEvent && current.current.selection.editing) { const edit = parseInlineEdit(event.data.edit); if (edit) current.current.onInlineEdit?.(edit); }
      if (event.data?.type === navigateEvent && !current.current.selection.editing) { const target = parseStudioTarget(event.data.target); if (target) current.current.onNavigate?.(target); }
      if(event.data?.type===previewEvents.unavailable) {setUnavailable(true);setLoaded(false);}
      if (event.data?.type === previewEvents.ready) { setLoaded(true); synchronize(); }
      if (event.data?.type === previewEvents.pointer) current.current.onPointer?.();
      if (event.data?.type === previewEvents.select || event.data?.type === previewEvents.anchor) {
        const rect = parseCanvasRect(event.data.rect);
        const box = frame.current?.getBoundingClientRect();
        if (rect && box && frame.current) {
          const scale = frame.current.offsetWidth ? box.width / frame.current.offsetWidth : 1;
          current.current.onAnchor?.(new DOMRect(box.left + rect.x * scale, box.top + rect.y * scale, rect.width * scale, rect.height * scale));
        }
      }
      const caret = parseCaret(event.data);
      if (caret !== undefined) current.current.onCaret?.(caret);
      if (event.data?.type === previewEvents.select && isBlockId(event.data.id) && (current.current.document ? isDocumentField(event.data.id) : current.current.workspace.draft.blocks.some((block) => block.id === event.data.id))) {
        const field = event.data.field;
        const scene = current.current.workspace.draft.blocks.find((block) => block.id === event.data.id)?.kind === "scene";
        if (scene && isSceneField(field)) current.current.onSelect(event.data.id, field);
        else current.current.onSelect(event.data.id);
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => { setAvailableWidth(Math.max(1, entry.contentRect.width)); if (entry.contentRect.height > 100) setAvailableHeight(entry.contentRect.height); });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  const width = mobile ? 390 : Math.max(1, Math.round(availableWidth));
  const height = mobile ? 844 : Math.max(300, Math.round(availableHeight));
  const scale = Math.min(1, availableWidth / width, mobile ? availableHeight / height : 1);
  return <div className="studio-canvas" ref={container}>
    <div className={`canvas-device ${mobile ? "device-mobile" : ""}`} style={{ width: width * scale, height: height * scale }}>
      {!loaded && <div className="canvas-loading" role="status">{unavailable ? <div className="canvas-session-message"><p>Oturumun sona erdi. Açık metnin burada korunuyor.</p><button onClick={()=>openAuth("login")}>Yeniden giriş yap</button></div> : "Tuval hazırlanıyor…"}</div>}
      {measured && <iframe ref={frame} onLoad={synchronize} title="Taslak tema canlı önizleme" src={`/preview?embedded=1&v=${epoch}`} style={{ width, height, transform: `scale(${scale})` }} />}
    </div>
  </div>;
}
