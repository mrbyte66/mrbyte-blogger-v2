import type { ReactNode } from "react";
import { EditorIcon } from "./EditorIcon";

export function CanvasToolbar({ title, mobile, editing, onMobile, onEditing, children, focused, onFocus }: {
  focused?: boolean; onFocus?: (value: boolean) => void;
  title: ReactNode; mobile: boolean; editing: boolean;
  onMobile: (mobile: boolean) => void; onEditing: (editing: boolean) => void; children?: ReactNode;
}) {
  return <div className="studio-canvas-tools">
    <div className="canvas-context">{children}</div>
    <div className="canvas-controls">
      <div className="device-switch" role="group" aria-label="Tuval etkileşimi"><button aria-pressed={editing} onClick={() => onEditing(true)}>Düzenle</button><button aria-pressed={!editing} onClick={() => onEditing(false)}>Önizle</button></div>
      <div className="device-switch device-icons" role="group" aria-label="Önizleme görünümü"><button title="Gerçek boyut" aria-label="Gerçek boyut" aria-pressed={!mobile} onClick={() => onMobile(false)}><EditorIcon name="desktop"/></button><button title="Mobil" aria-label="Mobil" aria-pressed={mobile} onClick={() => onMobile(true)}><EditorIcon name="mobile"/></button></div>
      {onFocus && <button className="canvas-focus-toggle" title={focused ? "Panelleri göster" : "Tuvale odaklan"} aria-label={focused ? "Panelleri göster" : "Tuvale odaklan"} aria-pressed={focused} onClick={() => onFocus(!focused)}><EditorIcon name="focus"/></button>}
    </div>
    <span className="sr-only">{title}</span>
  </div>;
}
