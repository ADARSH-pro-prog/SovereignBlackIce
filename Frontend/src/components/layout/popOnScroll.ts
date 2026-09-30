import { useLayoutEffect } from 'react';

/*
  Scroll "pop" for every dashboard page, applied from the layout so pages stay untouched.
  Cards, sections, table rows and list items spring in (slight overshoot) as they enter the
  viewport, staggered in reading order. New content (route changes, data arriving) is picked
  up by a MutationObserver. Classes are removed after the animation so hover transforms work.
*/

const SELECTOR = [
  'header',
  'table tbody tr',
  'ol > li',
  'ul > li',
  '.chart-card',
  '[class*="rounded-"][class*="border"]',
].join(',');

// Never animate chrome, popovers or dialogs.
const SKIP = '[role="dialog"], [role="status"], [role="menu"], .fixed, .absolute, button, a, input, select, textarea';

function eligible(el: Element, root: Element) {
  if (!root.contains(el) || el === root) return false;
  if (el.matches(SKIP) || el.closest('[role="dialog"], .fixed')) return false;
  if ((el as HTMLElement).dataset.popped) return false;
  // Only the outermost card pops; rows and list items inside it still get their own gentle rise.
  const isRow = el.matches('tr, li');
  if (!isRow) {
    const parent = el.parentElement?.closest(SELECTOR);
    if (parent && root.contains(parent) && parent !== root && !parent.matches('header')) return false;
  }
  return true;
}

export function usePopOnScroll(rootRef: React.RefObject<HTMLElement | null>, key: string) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let batch = 0;
    let batchTimer = 0;

    const io = new IntersectionObserver(
      (entries) => {
        const shown = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        shown.forEach((e) => {
          const el = e.target as HTMLElement;
          io.unobserve(el);
          el.style.animationDelay = `${Math.min(batch, 10) * 55}ms`;
          batch += 1;
          el.classList.remove('pop-pending');
          el.classList.add(el.matches('tr, li') ? 'pop-row' : 'pop-in');
          el.addEventListener(
            'animationend',
            () => {
              el.classList.remove('pop-in', 'pop-row');
              el.style.animationDelay = '';
            },
            { once: true }
          );
        });
        clearTimeout(batchTimer);
        batchTimer = window.setTimeout(() => (batch = 0), 140);
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.08 }
    );

    const scan = (scope: ParentNode) => {
      scope.querySelectorAll(SELECTOR).forEach((el) => {
        if (!eligible(el, root)) return;
        (el as HTMLElement).dataset.popped = '1';
        el.classList.add('pop-pending');
        io.observe(el);
      });
    };

    scan(root);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => n instanceof Element && scan(n.parentElement ?? root));
    });
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      clearTimeout(batchTimer);
      root.querySelectorAll('.pop-pending').forEach((el) => el.classList.remove('pop-pending'));
    };
  }, [rootRef, key]);
}
