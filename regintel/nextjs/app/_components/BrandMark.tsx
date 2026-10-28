// The Conform-Edge mark, copied from the website repo's brand assets.
//
// Replaces the hand-drawn "CE" square that stood in for it. The PNG has the
// navy plate (#0c2132) baked in — the website is dark-only for exactly that
// reason — so it must sit on a matching navy surface. Every current usage is
// on `bg-rail`, which is that same colour, so the plate disappears into the
// chrome and the mark reads as part of the page rather than a pasted image.
//
// Do NOT place this on a light surface: the plate would show as a navy box.
// Use the wordmark on a dark band, or ask for a transparent asset.

export default function BrandMark({
  size = 30,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/brand/conform-edge-mark.png"
      alt="Conform-Edge"
      width={size}
      height={size}
      // Dimensions are set both ways so the mark never causes layout shift
      // while the image loads.
      style={{ width: size, height: size }}
      className={`rounded-lg shrink-0 ${className}`}
    />
  );
}
