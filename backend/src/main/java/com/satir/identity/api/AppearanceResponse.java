package com.satir.identity.api;

import com.satir.identity.application.ProfileQuery.Appearance;

/** Contract {@code Appearance}: every field is present; null means the person has not chosen it. */
record AppearanceResponse(String colorMode, Boolean motion, String studioView) {

    static AppearanceResponse from(Appearance appearance) {
        return new AppearanceResponse(appearance.colorMode(), appearance.motion(), appearance.studioView());
    }
}
