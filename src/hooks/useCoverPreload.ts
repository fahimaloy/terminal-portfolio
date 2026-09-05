// src/hooks/useCoverPreload.ts
// Pre-decode next card's cover image before its swipe completes.
// Bottleneck in reels UIs is image pop-in — solve as data-fetching
// concern before tuning animation timing.

import { useEffect } from 'react';

export function useCoverPreload(
  urls: (string | null | undefined)[],
  activeIndex: number,
) {
  useEffect(() => {
    const nextUrl = urls[activeIndex + 1];
    if (!nextUrl) return;
    if (typeof window === 'undefined') return;

    const img = new window.Image();
    img.src = nextUrl;
    const maybeDecode = (
      img as HTMLImageElement & { decode?: () => Promise<void> }
    ).decode;
    if (typeof maybeDecode === 'function') {
      maybeDecode.call(img).catch(() => {
        // Fallback: onload will still prime browser cache for <Image> / <img>
      });
    }
  }, [urls, activeIndex]);
}

// Preload a list of URLs eagerly (e.g. initial buffer's covers).
export function useBulkCoverPreload(urls: (string | null | undefined)[]) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    urls.filter(Boolean).forEach((url) => {
      const img = new window.Image();
      img.src = url as string;
    });
  }, [urls]);
}
