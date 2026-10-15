"use client";
import { useEffect, useRef, useState } from "react";
import { avatars, ProfileAvatar } from "./ProfileAvatar";
import type { AvatarStyle } from "../../lib/auth/model";
export function AvatarChooser({ name, avatar, onChange, disabled = false }: { name: string; avatar: AvatarStyle; disabled?: boolean; onChange: (avatar: AvatarStyle) => void }) {
  const [open, setOpen] = useState(false); const [page, setPage] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); else if (!open && dialog.current?.open) dialog.current.close(); }, [open]);
  function close() { setOpen(false); trigger.current?.focus(); }
  return <><button type="button" ref={trigger} disabled={disabled} className="account-portrait" aria-label="Avatarı değiştir" onClick={() => { setPage(Math.floor(Math.max(0,avatars.findIndex(a => a.id === avatar))/12)); setOpen(true); }}><ProfileAvatar name={name} avatar={avatar} /><span aria-hidden="true">✎</span></button>
    <dialog ref={dialog} className="account-avatar-dialog" aria-labelledby="avatar-chooser-title" onCancel={close} onClose={close} onClick={e => { if (e.target === e.currentTarget) close(); }}><header><h2 id="avatar-chooser-title">Avatarın</h2><button type="button" aria-label="Avatar seçimini kapat" onClick={close}>×</button></header><fieldset className="avatar-picker"><legend className="visually-hidden">Profil avatarın</legend><div className="avatar-options">{avatars.slice(page*12,page*12+12).map(option => <label key={option.id} title={option.label}><input type="radio" name="avatar" checked={avatar === option.id} onChange={() => onChange(option.id)} aria-label={option.label} /><ProfileAvatar name={name} avatar={option.id} /></label>)}</div></fieldset><div className="avatar-pagination"><button type="button" disabled={page === 0} aria-label="Önceki avatarlar" onClick={() => setPage(p=>p-1)}>←</button><span>{page+1} / {Math.ceil(avatars.length/12)}</span><button type="button" disabled={(page+1)*12 >= avatars.length} aria-label="Sonraki avatarlar" onClick={() => setPage(p=>p+1)}>→</button><button type="button" className="auth-primary" onClick={close}>Tamam</button></div></dialog></>;
}
