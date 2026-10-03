export type PixelIconKind = "apple" | "heart" | "sparkle" | "yarn" | "lock" | "trophy" | "cat";

type PixelIconProps = {
  kind: PixelIconKind;
  className?: string;
};

export function PixelIcon({ kind, className = "" }: PixelIconProps) {
  return <span className={`pixel-icon pixel-icon-${kind} ${className}`.trim()} aria-hidden="true" />;
}
