"use client";
import type { Theme } from "../lib/builder/model";
import { SlideLink } from "./SlideLink";
import { ReadingIcon } from "./reading/ReadingIcon";
import { UtilityIsland } from "./UtilityIsland";
import { ThemeToggle } from "./SitePreferences";
import { AccountMenu } from "./auth/AccountMenu";
import { SavedLibraryLink } from "./saved/SaveArticleButton";
export function SitePageHeader({ theme, preview = false, account = true }: { theme: Theme; preview?: boolean; account?: boolean }) {
  return <header className="site-page-header" data-edit-field="layout"><SlideLink className="site-page-wordmark" href="/" direction="back">{theme.siteName}.</SlideLink><nav aria-label="Sayfa araçları"><SlideLink className="site-page-back" href="/" direction="back"><span aria-hidden="true">←</span> Siteye dön</SlideLink><UtilityIsland><ThemeToggle defaultDark={theme.surface === "night"} />{!preview && account && <><SavedLibraryLink /><SlideLink className="saved-library-link" href="/notlar" aria-label="Notlarım" title="Notlarım"><ReadingIcon name="note"/></SlideLink><AccountMenu /></>}</UtilityIsland></nav></header>;
}
