export type PixelIconKind =
  | "apple" | "heart" | "sparkle" | "yarn" | "lock" | "trophy" | "cat"
  | "sound" | "mute" | "bee" | "tree" | "paw" | "moon" | "pine" | "wolf"
  | "crown" | "acorn" | "tooth" | "wheel" | "parrot" | "gem" | "rock" | "paper" | "scissors";

type PixelIconProps = {
  kind: PixelIconKind;
  className?: string;
};

export function PixelIcon({ kind, className = "" }: PixelIconProps) {
  return <span className={`pixel-icon pixel-icon-${kind} ${className}`.trim()} aria-hidden="true" />;
}
