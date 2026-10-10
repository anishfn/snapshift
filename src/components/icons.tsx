import type { SVGProps } from "react";

// anishfn.ink icons, the subset this chat uses: 18px grid, puffy and round. Filled shapes are traced with a thick
// round-joined stroke of the same color, which inflates them and rounds every corner;
// line glyphs are 1.6px strokes with round caps. No sharp points. Single tone, currentColor.

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function Icon({ size = 18, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="currentColor" aria-hidden {...props}>
      {children}
    </svg>
  );
}

/** Heavy round stroke for line glyphs. */
const line = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Inflates a filled shape and rounds all of its corners. */
const puff = { stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" } as const;

export const XIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M5.25 5.25l7.5 7.5M12.75 5.25l-7.5 7.5" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M4.4 9.6l3 3 6.2-6.4" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M9 4.25v9.5M4.25 9h9.5" />
  </Icon>
);

export const ChevronUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M4.75 10.75L9 6.5l4.25 4.25" />
  </Icon>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M4.75 7.25L9 11.5l4.25-4.25" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M7.25 4.75L11.5 9l-4.25 4.25" />
  </Icon>
);

export const NoteIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect {...line} x="3.6" y="3" width="10.8" height="12" rx="2.4" />
    <path {...line} d="M6.5 7h5M6.5 9.6h5M6.5 12.2h2.8" />
  </Icon>
);

export const BoltIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...puff} d="M10 3.6L5.6 9.9h3.1l-.8 4.5 4.5-6.4H9.3L10 3.6z" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M3.9 5.3h10.2M7.3 5.1V4.1c0-.45.35-.8.8-.8h1.8c.45 0 .8.35.8.8v1" />
    <path {...puff} d="M5.3 7.4h7.4l-.55 6.4a1.2 1.2 0 01-1.2 1.1H7.05a1.2 1.2 0 01-1.2-1.1L5.3 7.4z" />
  </Icon>
);

export const QuoteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...puff} strokeWidth={1.1} d="M4.2 7.9c0-1.5.8-2.7 2.3-3.3l.4.7c-.8.45-1.2 1-1.3 1.7h.3a1.3 1.3 0 010 2.6h-.4a1.3 1.3 0 01-1.3-1.3v-.4zM8.8 7.9c0-1.5.8-2.7 2.3-3.3l.4.7c-.8.45-1.2 1-1.3 1.7h.3a1.3 1.3 0 010 2.6h-.4a1.3 1.3 0 01-1.3-1.3v-.4z" />
    <path {...line} d="M4 12.4h10M4 15h6.6" />
  </Icon>
);

export const ReturnIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M14.6 4.4v3.4a2.2 2.2 0 01-2.2 2.2H3.6M6.5 7.1L3.6 10l2.9 2.9" />
  </Icon>
);

export const SparkleIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...puff} d="M7.8 4.6c.35 2.2 1.25 3.3 3.6 4.4-2.35 1.1-3.25 2.2-3.6 4.4-.35-2.2-1.25-3.3-3.6-4.4 2.35-1.1 3.25-2.2 3.6-4.4z" />
    <path {...puff} strokeWidth={1.5} d="M13.9 2.9c.15.95.55 1.45 1.55 1.9-1 .45-1.4.95-1.55 1.9-.15-.95-.55-1.45-1.55-1.9 1-.45 1.4-.95 1.55-1.9z" />
  </Icon>
);

export const SidebarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect {...line} x="2.75" y="3.25" width="12.5" height="11.5" rx="3" />
    <path {...line} d="M7 3.5v11" />
  </Icon>
);

export const PaperclipIcon = (p: IconProps) => (
  <Icon {...p}>
    <path
      {...line}
      d="M12 4.5L5.7 10.9a1.5 1.5 0 002.1 2.1l6.3-6.4a3 3 0 10-4.2-4.2L3.6 8.8a4.5 4.5 0 106.4 6.4l6.2-6.4"
    />
  </Icon>
);

export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...puff} strokeWidth={1.25} d="M5.4 3h3.9a2.5 2.5 0 012.3 1.5H6.6a2.1 2.1 0 00-2.1 2.1v5.1A2.5 2.5 0 013 9.4V5.4A2.4 2.4 0 015.4 3z" />
    <rect {...puff} strokeWidth={1.25} x="6.6" y="6.6" width="8.4" height="8.4" rx="2.6" />
  </Icon>
);

export const FolderIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...puff} d="M3.5 5.4c0-.66.54-1.2 1.2-1.2h2.7c.4 0 .77.2 1 .53l.75 1.1h4.15c.66 0 1.2.54 1.2 1.2v6.2c0 .66-.54 1.2-1.2 1.2H4.7c-.66 0-1.2-.54-1.2-1.2V5.4z" />
  </Icon>
);

export const BranchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle {...line} cx="5.5" cy="4.6" r="1.6" />
    <circle {...line} cx="5.5" cy="13.4" r="1.6" />
    <circle {...line} cx="12.5" cy="6.4" r="1.6" />
    <path {...line} d="M5.5 6.2v5.6M12.5 8c0 1.9-1.3 2.6-3.2 2.8-1.9.2-3.3.4-3.7 1" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M10.75 4.75L6.5 9l4.25 4.25" />
  </Icon>
);

export const MinusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M4.25 9h9.5" />
  </Icon>
);

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M9 3.6v7.2M5.9 8L9 11.1 12.1 8M3.8 12.5v.8c0 .9.7 1.6 1.6 1.6h7.2c.9 0 1.6-.7 1.6-1.6v-.8" />
  </Icon>
);

export const ArrowUpRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M5.25 12.75l7.5-7.5M6.75 5.25h6v6" />
  </Icon>
);

export const RotateIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect {...puff} strokeWidth={1.25} x="4" y="7.6" width="7.4" height="7.4" rx="1.8" />
    <path {...line} d="M6.2 4.9a4.6 4.6 0 017.3 3.2M12.1 6.9l1.4 1.3 1.3-1.4" />
  </Icon>
);

export const StarIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...puff} d="M9.00 3.35L10.73 7.36L15.09 7.77L11.81 10.66L12.76 14.93L9.00 12.70L5.24 14.93L6.19 10.66L2.91 7.77L7.27 7.36z" />
  </Icon>
);

export const LinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M7.5 10.5l3-3M8.4 5.5l.9-.9a2.9 2.9 0 014.1 4.1l-.9.9M9.6 12.5l-.9.9a2.9 2.9 0 01-4.1-4.1l.9-.9" />
  </Icon>
);

export const MailIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect {...line} x="3" y="4.4" width="12" height="9.2" rx="2.2" />
    <path {...line} d="M3.9 5.7L9 9.4l5.1-3.7" />
  </Icon>
);

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect {...line} x="3.2" y="4.3" width="11.6" height="10.4" rx="2.4" />
    <path {...line} d="M3.6 7.7h10.8M6.4 2.9v2.6M11.6 2.9v2.6" />
    <circle cx="6.6" cy="10.6" r="1" />
    <circle cx="9" cy="10.6" r="1" />
  </Icon>
);

export const TimerIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle {...line} cx="9" cy="10.2" r="5.1" />
    <path {...line} d="M9 10.2V7.5M7.4 2.9h3.2" />
  </Icon>
);

export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle {...puff} strokeWidth={1.25} cx="5.9" cy="6.5" r="1.8" />
    <circle {...puff} strokeWidth={1.25} cx="12.1" cy="6.5" r="1.8" />
    <path {...puff} strokeWidth={1.25} d="M3.75 13.3c.28-1.6 1.05-2.45 2.15-2.45s1.87.85 2.15 2.45c.07.42-.23.8-.66.8H4.41c-.43 0-.73-.38-.66-.8z" />
    <path {...puff} strokeWidth={1.25} d="M9.95 13.3c.28-1.6 1.05-2.45 2.15-2.45s1.87.85 2.15 2.45c.07.42-.23.8-.66.8h-2.98c-.43 0-.73-.38-.66-.8z" />
  </Icon>
);

export const EyeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M2.7 9c1.45-2.75 3.55-4.15 6.3-4.15s4.85 1.4 6.3 4.15c-1.45 2.75-3.55 4.15-6.3 4.15S4.15 11.75 2.7 9z" />
    <circle cx="9" cy="9" r="2" />
  </Icon>
);

export const ImageIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect {...line} x="2.9" y="3.7" width="12.2" height="10.6" rx="2.6" />
    <circle cx="6.6" cy="7.3" r="1.3" />
    <path {...puff} strokeWidth={1} d="M5 12.6l2.9-3 1.9 1.8 1.7-1.6 1.6 2.8H5z" />
  </Icon>
);

export const ForwardIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...puff} strokeWidth={1.2} d="M3 5.6v6.8c0 .48.53.77.93.5l4.9-3.4a.6.6 0 000-1l-4.9-3.4C3.53 4.83 3 5.12 3 5.6z" />
    <path {...puff} strokeWidth={1.2} d="M9.6 5.6v6.8c0 .48.53.77.93.5l4.9-3.4a.6.6 0 000-1l-4.9-3.4c-.4-.27-.93.02-.93.5z" />
  </Icon>
);

export const ChecklistIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M3.3 5.5l1.25 1.25 2.3-2.5M9.4 5.6h5.3M9.4 12.2h5.3" />
    <circle {...line} cx="4.9" cy="12.2" r="1.7" />
  </Icon>
);

export const SpacesIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect {...line} x="2.8" y="5" width="8.6" height="8" rx="2" />
    <path {...line} d="M13.5 6.4v5.2M15.6 7.6v2.8" />
  </Icon>
);

export const ClipboardIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M6.2 4.4h-.3a1.9 1.9 0 00-1.9 1.9v6.9a1.9 1.9 0 001.9 1.9h6.2a1.9 1.9 0 001.9-1.9V6.3a1.9 1.9 0 00-1.9-1.9h-.3" />
    <rect {...puff} strokeWidth={1.25} x="6.7" y="3.1" width="4.6" height="2.6" rx="1" />
  </Icon>
);

export const PollIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect {...puff} strokeWidth={1} x="3.6" y="4" width="10.8" height="2.2" rx="1.1" />
    <rect {...puff} strokeWidth={1} x="3.6" y="7.9" width="6.6" height="2.2" rx="1.1" />
    <rect {...puff} strokeWidth={1} x="3.6" y="11.8" width="8.8" height="2.2" rx="1.1" />
  </Icon>
);

export const GlobeIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle {...line} cx="9" cy="9" r="6.25" />
    <path {...line} strokeWidth={1.4} d="M3 9h12M9 2.9c-1.7 1.8-2.5 3.8-2.5 6.1s.8 4.3 2.5 6.1c1.7-1.8 2.5-3.8 2.5-6.1S10.7 4.7 9 2.9z" />
  </Icon>
);

export const TabIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M2.9 9h9.6M9.4 5.9L12.5 9l-3.1 3.1M15.1 5.2v7.6" />
  </Icon>
);

export const ChatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...puff} d="M5.6 4.4h6.8a1.9 1.9 0 011.9 1.9v4.2a1.9 1.9 0 01-1.9 1.9H9.3l-2.6 1.9c-.3.22-.7 0-.7-.37V12.4h-.4a1.9 1.9 0 01-1.9-1.9V6.3a1.9 1.9 0 011.9-1.9z" />
  </Icon>
);

export const TargetIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle {...line} cx="9" cy="9" r="5.9" />
    <circle {...line} cx="9" cy="9" r="3" />
    <circle cx="9" cy="9" r="1.1" />
  </Icon>
);

export const BucketIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...puff} d="M4.6 8.2L8.4 4.4l5 5-4.1 4.1a1.3 1.3 0 01-1.85 0L4.6 10.65a1.75 1.75 0 010-2.45z" />
    <path d="M14.9 11.3c.65.95 1 1.6 1 2.15a1 1 0 01-2 0c0-.55.35-1.2 1-2.15z" />
  </Icon>
);

export const PlaneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...puff} d="M14.4 3.6L3.7 8.1c-.48.2-.44.88.06 1.03l3.9 1.2 1.2 3.9c.15.5.83.54 1.03.06L14.4 3.6z" />
  </Icon>
);

export const HeartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...puff} d="M9 14.3c-.3 0-.6-.1-.86-.27C5.2 12.1 3.2 10 3.2 7.35A2.95 2.95 0 019 6.05a2.95 2.95 0 015.8 1.3c0 2.65-2 4.75-4.94 6.68-.26.17-.56.27-.86.27z" />
  </Icon>
);

export const MarkerIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...puff} d="M11.5 3.6l2.9 2.9-6.1 6.1-3.4.5.5-3.4 6.1-6.1z" />
    <path {...line} d="M3.6 15h4.6" />
  </Icon>
);

export const WalletIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect {...line} x="3" y="4.4" width="12" height="9.6" rx="2.4" />
    <path {...line} d="M15 7.6h-2.7a1.6 1.6 0 000 3.2H15" />
  </Icon>
);

export const CalculatorIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect {...line} x="4" y="2.9" width="10" height="12.2" rx="2.4" />
    <rect {...puff} strokeWidth={1} x="6.4" y="5.2" width="5.2" height="1.8" rx=".6" />
    <circle cx="6.9" cy="10.1" r=".85" />
    <circle cx="9" cy="10.1" r=".85" />
    <circle cx="11.1" cy="10.1" r=".85" />
    <circle cx="6.9" cy="12.6" r=".85" />
    <circle cx="9" cy="12.6" r=".85" />
    <circle cx="11.1" cy="12.6" r=".85" />
  </Icon>
);

export const BookmarkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...puff} d="M5.8 3.7h6.4c.5 0 .9.4.9.9v9.8c0 .4-.45.63-.78.4L9 12.5l-3.32 2.3c-.33.23-.78 0-.78-.4V4.6c0-.5.4-.9.9-.9z" />
  </Icon>
);

export const ViewfinderIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...line} d="M3.2 6.4V5.2a2 2 0 012-2h1.2M11.6 3.2h1.2a2 2 0 012 2v1.2M14.8 11.6v1.2a2 2 0 01-2 2h-1.2M6.4 14.8H5.2a2 2 0 01-2-2v-1.2" />
    <circle cx="9" cy="9" r="2.3" />
  </Icon>
);

export const PlayIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...puff} d="M6.6 4.9v8.2c0 .58.64.93 1.13.6l6.1-4.1a.72.72 0 000-1.2l-6.1-4.1c-.49-.33-1.13.02-1.13.6z" />
  </Icon>
);

export const PauseIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect {...puff} x="5" y="4.5" width="2.6" height="9" rx="1" />
    <rect {...puff} x="10.4" y="4.5" width="2.6" height="9" rx="1" />
  </Icon>
);
