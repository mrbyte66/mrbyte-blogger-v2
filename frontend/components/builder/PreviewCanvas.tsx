"use client";

import { inlineEditEvent, parseInlineEdit, type InlineEdit } from "../../lib/builder/inline-edit";
import { useEffect, useRef, useState } from "react";
import type { Workspace } from "../../lib/builder/model";
import { isBlockId, isSceneField, parseCaret, type CaretPosition, type SceneField, previewEvents, type CanvasSelection } from "../../lib/builder/preview-protocol";

import { documentEvent, navigateEvent, parseStudioTarget, isDocumentField, type DocumentDraft, type StudioTarget } from "../../lib/builder/document-protocol";

type Props = {
  document?: DocumentDraft | null;
  onInlineEdit?: (edit: InlineEdit) => void;
  onNavigate?: (target: StudioTarget) => void;
  mobile: boolean;
  workspace: Workspace;
  selection: CanvasSelection;
  onSelect: (id: string, field?: SceneField) => void;
  /** Where the writing caret sits in the frame (document editing only). */
  onCaret?: (caret: CaretPosition) => void;
};

export function PreviewCanvas({ mobile, workspace, selection, onSelect, document = null, onNavigate, onInlineEdit, onCaret }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [availableHeight, setAvailableHeight] = useState(760);
  const [availableWidth, setAvailableWidth] = useState(600);
  const [loaded, setLoaded] = useState(false);
  const serialized = JSON.stringify(workspace);
  const current = useRef({ serialized, selection, workspace, onSelect, document, onNavigate, onInlineEdit, onCaret });
  current.current = { serialized, selection, workspace, onSelect, document, onNavigate, onInlineEdit, onCaret };

  function synchronize() {
    const target = frame.current?.contentWindow;
    const state = current.current;
    target?.postMessage({ type: previewEvents.workspace, workspace: state.serialized }, window.location.origin);
    target?.postMessage({ type: documentEvent, document: state.document }, window.location.origin);
    target?.postMessage({ type: previewEvents.selection, ...state.selection }, window.location.origin);
  }

  useEffect(() => { synchronize(); }, [serialized, document]);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: previewEvents.selection, ...selection }, window.location.origin);
  }, [selection.id, selection.request, selection.editing]);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === inlineEditEvent && current.current.selection.editing) { const edit = parseInlineEdit(event.data.edit); if (edit) current.current.onInlineEdit?.(edit); }
      if (event.data?.type === navigateEvent && !current.current.selection.editing) { const target = parseStudioTarget(event.data.target); if (target) current.current.onNavigate?.(target); }
      if (event.data?.type === previewEvents.ready) { setLoaded(true); synchronize(); }
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
      {!loaded && <div className="canvas-loading" role="status">Tuval hazırlanıyor…</div>}
      <iframe ref={frame} onLoad={synchronize} title="Taslak tema canlı önizleme" src="/preview?embedded=1" style={{ width, height, transform: `scale(${scale})` }} />
    </div>
  </div>;
}
