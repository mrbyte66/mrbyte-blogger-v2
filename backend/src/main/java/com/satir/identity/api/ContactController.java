package com.satir.identity.api;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import com.satir.identity.application.ContactService;

@RestController
class ContactController {
    record ContactRequest(String name, String email, String subject, String message) {
        @Override public String toString() { return "ContactRequest[redacted]"; }
    }
    private final ContactService contact;
    ContactController(ContactService contact) { this.contact = contact; }
    @PostMapping("/api/v1/contact")
    ResponseEntity<Void> send(@RequestBody ContactRequest body, HttpServletRequest request) {
        contact.send(body.name(), body.email(), body.subject(), body.message(), request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
