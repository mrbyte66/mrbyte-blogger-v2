package com.satir.editorial.application;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import com.satir.delivery.application.JobHandler;
import com.satir.delivery.application.MailGateway;
import com.satir.editorial.infrastructure.ArticleRepository;
import com.satir.editorial.infrastructure.EditorialRows.ArticleRow;
import com.satir.identity.application.ProfileQuery;
import com.satir.identity.application.ProfileQuery.ProfileView;

/** One job per first-publication recipient, so a retry does not resend to successful recipients. */
@Component
class ReaderPublicationEmailHandler implements JobHandler {
    private final ArticleRepository articles;
    private final ProfileQuery profiles;
    private final MailGateway mail;
    private final TransactionTemplate transactions;
    private final String origin;

    ReaderPublicationEmailHandler(ArticleRepository articles, ProfileQuery profiles, MailGateway mail,
            TransactionTemplate transactions, @Value("${satir.site.public-origin}") String origin) {
        this.articles = articles; this.profiles = profiles; this.mail = mail;
        this.transactions = transactions; this.origin = origin.replaceAll("/+$", "");
    }

    @Override public String type() { return ArticleCommands.READER_PUBLICATION_EMAIL_JOB; }

    @Override public Outcome handle(Job job) {
        record Eligible(ArticleRow article, ProfileView reader) { }
        UUID recipient = UUID.fromString(job.payload().get("recipientId").toString());
        var eligible = transactions.execute(status -> articles.findPublic(job.aggregateId())
            .filter(ArticleRow::isPublic)
            .filter(article -> article.firstPublishedAt() != null && !article.ownerId().equals(recipient))
            .flatMap(article -> profiles.ownProfile(recipient)
                .filter(ProfileView::verified).filter(ProfileView::publicationSubscription)
                .map(reader -> new Eligible(article, reader))));
        if (eligible.isEmpty()) return new Outcome.Skipped("NOT_ELIGIBLE");
        var item = eligible.get();
        String body = """
            Merhaba %s,

            Yeni bir yazı yayımlandı: "%s".
            %s%s

            Yeni yayın e-postalarını Hesap → Bildirimler bölümünden kapatabilirsin.
            """.formatted(item.reader().name(), item.article().title(), origin,
                EditorialAssembler.articlePath(item.article().slug()));
        return switch (mail.send(new MailGateway.Message(item.reader().email(),
                "Yeni yayın: " + item.article().title(), body, job.dedupeKey()))) {
            case SENT -> new Outcome.Done();
            case NOT_CONFIGURED -> new Outcome.Retry("MAIL_NOT_CONFIGURED");
            case FAILED -> new Outcome.Retry("MAIL_SEND_FAILED");
        };
    }
}
