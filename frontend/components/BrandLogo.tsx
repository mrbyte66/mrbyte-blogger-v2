/** MrByte pixel wordmark; colors follow the surrounding theme (ink, muted, --brand-bit). */
export function BrandLogo({ label, studio = false, className = "" }: { label?: string; studio?: boolean; className?: string }) {
  return <svg className={`brand-logo ${className}`.trim()} viewBox={studio ? "20 20 680 220" : "20 20 680 190"} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
    <path className="brand-logo-mr" d="M29 185V119C29 87 78 87 78 119V185M78 119C78 87 127 87 127 119V185M157 185V120C157 99 177 94 211 94" fill="none" strokeWidth="17" />
    <path className="brand-logo-byte" fillRule="evenodd" d="M240 40H278V84H330V101H348V185H240ZM278 120V151H310V120ZM365 84H403V146H435V84H473V185H455V203H384V185H435V164H384V149H365ZM491 64H529V90H563V123H529V149H563V185H509V168H491ZM600 84H670V102H689V145H619V152H689V185H600V167H582V102H600ZM619 111V123H652V111Z" />
    <rect className="brand-logo-bit" x="278" y="25" width="22" height="22" />
    {studio && <path className="brand-logo-studio" d="M250 215H240V223H250V231H240M261 215H275M268 215V231M286 215V228Q286 231 290 231H294Q298 231 298 228V215M310 231V215H315Q323 215 323 223Q323 231 315 231ZM336 215V231M351 215H357Q360 215 360 219V227Q360 231 357 231H351Q348 231 348 227V219Q348 215 351 215Z" fill="none" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="square" />}
  </svg>;
}
