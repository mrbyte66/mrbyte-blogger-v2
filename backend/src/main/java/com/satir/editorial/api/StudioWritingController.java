package com.satir.editorial.api;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.satir.editorial.application.WritingProgress;
import com.satir.editorial.application.WritingProgress.Today;
import com.satir.identity.application.SatirPrincipal;

/** Owner-only writing activity (daily word progress). Security config restricts /studio/** to OWNER. */
@RestController
@RequestMapping("/api/v1/studio/writing")
class StudioWritingController {

    private final WritingProgress progress;

    StudioWritingController(WritingProgress progress) {
        this.progress = progress;
    }

    @GetMapping("/today")
    Today today(@AuthenticationPrincipal SatirPrincipal owner) {
        return progress.today(owner.userId());
    }
}
