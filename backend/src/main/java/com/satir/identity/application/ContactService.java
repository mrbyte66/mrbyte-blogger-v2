package com.satir.identity.application;

import java.time.Duration;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import com.satir.delivery.application.MailGateway;
import com.satir.identity.domain.EmailAddress;
import com.satir.identity.infrastructure.MembershipRepository;
import com.satir.platform.api.ApiException;
import com.satir.platform.ratelimit.RateLimiter;
import com.satir.platform.validation.ValidationException;

/** Public contact mail goes only to the active owner, never a client-supplied recipient. */
@Service
public class ContactService {
    private static final RateLimiter.Limit CLIENT = new RateLimiter.Limit("contact-client", 5, Duration.ofHours(1));
    private static final RateLimiter.Limit ADDRESS = new RateLimiter.Limit("contact-address", 3, Duration.ofHours(1));
    private static final RateLimiter.Limit GLOBAL = new RateLimiter.Limit("contact-site", 30, Duration.ofHours(1));
    private final MembershipRepository accounts;
    private final MailGateway mail;
    private final RateLimiter limits;

    ContactService(MembershipRepository accounts, MailGateway mail, RateLimiter limits) {
        this.accounts = accounts; this.mail = mail; this.limits = limits;
    }

    public void send(String name, String email, String subject, String message, String client) {
        String sender = line("name", name, 80);
        EmailAddress address = EmailAddress.parse("email", email);
        String title = line("subject", subject, 120);
        if (message == null || message.isBlank()) throw new ValidationException("message", "REQUIRED");
        if (message.length() > 5000 || message.indexOf('\0') >= 0) throw new ValidationException("message", "LENGTH");
        var wait = limits.blockedFor(CLIENT, client).or(() -> limits.blockedFor(ADDRESS, address.normalized()))
                .or(() -> limits.blockedFor(GLOBAL, "site"));
        if (wait.isPresent()) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Çok fazla mesaj gönderildi; biraz sonra tekrar dene", wait.get());
        limits.record(CLIENT, client); limits.record(ADDRESS, address.normalized()); limits.record(GLOBAL, "site");
        String recipient = accounts.contactOwnerEmail().orElseThrow(ContactService::unavailable);
        var result = mail.send(new MailGateway.Message(recipient, "İletişim · " + title,
                "Gönderen: " + sender + "\nE-posta: " + address.value() + "\n\n" + message.strip(), "contact-mail", address.value()));
        if (result != MailGateway.Result.SENT) throw unavailable();
    }

    private static String line(String field, String raw, int max) {
        if (raw == null || raw.isBlank()) throw new ValidationException(field, "REQUIRED");
        String value = raw.strip();
        if (value.length() > max || value.chars().anyMatch(Character::isISOControl)) throw new ValidationException(field, "FORMAT");
        return value;
    }
    private static ApiException unavailable() { return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "MAIL_UNAVAILABLE", "Mesaj gönderilemedi. Biraz sonra tekrar dene."); }
}
