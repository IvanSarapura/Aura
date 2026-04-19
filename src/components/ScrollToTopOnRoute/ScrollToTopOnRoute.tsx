'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Resets window scroll on pathname change. Next.js usually scrolls to top on
 * navigation, but client transitions from a long profile can leave the window
 * offset; this runs before paint to keep the new route anchored at the top.
 */
export function ScrollToTopOnRoute() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
