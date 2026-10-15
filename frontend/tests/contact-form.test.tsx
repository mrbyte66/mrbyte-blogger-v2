import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthProvider } from "../components/auth/AuthProvider";
import { ContactForm } from "../components/ContactForm";
import { fakeBackend, settle } from "./support/fake-backend";
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it("keeps the message on SMTP failure and shows success only after acceptance", async () => {
 const backend=fakeBackend({signedIn:{name:"Okur",email:"okur@example.test"}});
 const original=backend.fetchMock.getMockImplementation()!; let accepted=false;
 backend.fetchMock.mockImplementation((input,init)=>String(input).endsWith("/contact") ? Promise.resolve(accepted ? new Response(null,{status:204}) : new Response(JSON.stringify({code:"MAIL_UNAVAILABLE",title:"Mesaj gönderilemedi"}),{status:503})) : original(input,init));
 render(<AuthProvider><ContactForm /></AuthProvider>); await act(settle);
 fireEvent.change(screen.getByLabelText("Adın"),{target:{value:"Okur"}});
 fireEvent.change(screen.getByLabelText("E-posta"),{target:{value:"okur@example.test"}});
 fireEvent.change(screen.getByLabelText("Konu"),{target:{value:"Merhaba"}});
 fireEvent.change(screen.getByLabelText("Mesajın"),{target:{value:"Bir mesaj"}});
 await act(async()=>{fireEvent.click(screen.getByRole("button",{name:"Mesajı gönder ↗"}));await settle();});
 expect(screen.getByRole("alert").textContent).toContain("Mesaj gönderilemedi");
 expect(screen.getByLabelText("Mesajın")).toHaveProperty("value","Bir mesaj");
 expect(screen.queryByText("Mesajın gönderildi.")).toBeNull();
 accepted=true;
 await act(async()=>{fireEvent.click(screen.getByRole("button",{name:"Mesajı gönder ↗"}));await settle();});
 expect(screen.getByText("Mesajın gönderildi.")).toBeTruthy();
});
it("validates empty contact fields before attempting delivery",async()=>{
 const backend=fakeBackend();render(<AuthProvider><ContactForm /></AuthProvider>);await act(settle);
 fireEvent.click(screen.getByRole("button",{name:"Mesajı gönder ↗"}));
 expect(screen.getByLabelText("Mesajın").getAttribute("aria-invalid")).toBe("true");
 expect(backend.state.calls.some(c=>c.path==="/contact")).toBe(false);
});
