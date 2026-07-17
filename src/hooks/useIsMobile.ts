import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 1024) {
  const getIsMobile = () => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < breakpoint;
  };

  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => setIsMobile(getIsMobile());
    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}
