package com.satir.identity.infrastructure;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Account-wide preferences, including the appearance that follows the account (null = not chosen). */
@Entity
@Table(name = "user_preference")
public class UserPreferenceEntity {

    public static final String DEFAULT_TIME_ZONE = "Europe/Istanbul";

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "publication_email", nullable = false)
    private boolean publicationEmail;

    @Column(name = "publication_subscription", nullable = false)
    private boolean publicationSubscription;

    @Column(name = "preferred_timezone", nullable = false)
    private String preferredTimezone;

    @Column(name = "color_mode")
    private String colorMode;

    @Column(name = "motion")
    private Boolean motion;

    @Column(name = "studio_view")
    private String studioView;

    protected UserPreferenceEntity() {
    }

    public static UserPreferenceEntity defaults(UUID userId) {
        UserPreferenceEntity preference = new UserPreferenceEntity();
        preference.userId = userId;
        preference.publicationEmail = true;
        preference.publicationSubscription = true;
        preference.preferredTimezone = DEFAULT_TIME_ZONE;
        return preference;
    }

    public boolean isPublicationEmail() {
        return publicationEmail;
    }

    public boolean isPublicationSubscription() { return publicationSubscription; }

    public String getPreferredTimezone() {
        return preferredTimezone;
    }

    public String getColorMode() { return colorMode; }

    public Boolean getMotion() { return motion; }

    public String getStudioView() { return studioView; }
}
