/** Fired after the person (not the account sync) changed their colour mode, motion or Studio view. */
export const appearanceChangedEvent = "satir:appearance-changed";
export function announceAppearanceChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(appearanceChangedEvent));
}
