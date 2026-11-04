/** Small inline SVG icons (decorative unless a title is given). */
type P = { title?: string; size?: number };
const svg = (path: React.ReactNode, { title, size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} focusable="false">
    {title ? <title>{title}</title> : null}
    {path}
  </svg>
);
export const LockIcon = (p: P) => svg(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>, p);
export const AlertIcon = (p: P) => svg(<><path d="M12 3 2 21h20L12 3z" /><path d="M12 10v5" /><path d="M12 18h.01" /></>, p);
export const CheckIcon = (p: P) => svg(<path d="m5 12 5 5 9-10" />, p);
export const InfoIcon = (p: P) => svg(<><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><path d="M12 7h.01" /></>, p);
export const RowsIcon = (p: P) => svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16" /></>, p);
export const PrintIcon = (p: P) => svg(<><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M6 14h12v7H6z" /></>, p);
export const DownloadIcon = (p: P) => svg(<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></>, p);
export const QuestionIcon = (p: P) => svg(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7v.5" /><path d="M12 17h.01" /></>, p);
export const XIcon = (p: P) => svg(<path d="M6 6l12 12M18 6 6 18" />, p);
