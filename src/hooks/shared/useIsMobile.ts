import { useEffect, useState } from "react";

function getIsMobile(breakpoint: number) {
  if (typeof window === "undefined") return false;
  const viewportWidth = Math.min(
    window.innerWidth || Number.MAX_SAFE_INTEGER,
    document.documentElement?.clientWidth || Number.MAX_SAFE_INTEGER,
    window.visualViewport?.width || Number.MAX_SAFE_INTEGER,
  );
  return viewportWidth < breakpoint;
}

export function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(() => getIsMobile(breakpoint));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onResize = () => setIsMobile(getIsMobile(breakpoint));
    const onMediaChange = () => setIsMobile(getIsMobile(breakpoint));

    // Sync once in case viewport changed between render and effect.
    onResize();

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    mediaQuery.addEventListener?.("change", onMediaChange);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      mediaQuery.removeEventListener?.("change", onMediaChange);
    };
  }, [breakpoint]);

  return isMobile;
}
