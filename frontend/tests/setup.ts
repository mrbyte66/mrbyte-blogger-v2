import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(cleanup);
// Per-tab state (the Studio's recently opened pages) must not leak from one test into the next.
afterEach(() => { try { sessionStorage.clear(); } catch { /* not available */ } });
// jsdom lacks native dialog methods. Browser checks cover focus/inert behavior.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
