// Line icons used across the app in place of emoji. Pure SVG, no hooks, so they
// render in both server and client components. `stroke="currentColor"` lets each
// icon inherit the surrounding text colour; size defaults to 1em.

type IconProps = { className?: string; size?: number | string };

function Base({ className, size = '1em', children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const FeedIcon = (p: IconProps) => (
  <Base {...p}><path d="M3 13h8V3H3zM13 21h8V3h-8zM3 21h8v-6H3z" /></Base>
);
export const ArchiveIcon = (p: IconProps) => (
  <Base {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></Base>
);
export const UserIcon = (p: IconProps) => (
  <Base {...p}><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></Base>
);
export const ShieldIcon = (p: IconProps) => (
  <Base {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Base>
);
export const SignOutIcon = (p: IconProps) => (
  <Base {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Base>
);
export const RefreshIcon = (p: IconProps) => (
  <Base {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></Base>
);
export const PlusIcon = (p: IconProps) => (
  <Base {...p}><path d="M12 5v14M5 12h14" /></Base>
);
export const SearchIcon = (p: IconProps) => (
  <Base {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></Base>
);
export const AlertIcon = (p: IconProps) => (
  <Base {...p}><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></Base>
);
export const ClockIcon = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Base>
);
export const ExternalIcon = (p: IconProps) => (
  <Base {...p}><path d="M7 17 17 7M8 7h9v9" /></Base>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Base {...p}><path d="m6 9 6 6 6-6" /></Base>
);
export const DownloadIcon = (p: IconProps) => (
  <Base {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></Base>
);
export const PrinterIcon = (p: IconProps) => (
  <Base {...p}><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></Base>
);
export const MenuIcon = (p: IconProps) => (
  <Base {...p}><path d="M3 6h18M3 12h18M3 18h18" /></Base>
);
export const CheckIcon = (p: IconProps) => (
  <Base {...p}><path d="M20 6 9 17l-5-5" /></Base>
);
export const PlayIcon = (p: IconProps) => (
  <Base {...p}><path d="M6 4v16l14-8z" /></Base>
);
export const FilterIcon = (p: IconProps) => (
  <Base {...p}><path d="M3 5h18l-7 8v6l-4-2v-4z" /></Base>
);
