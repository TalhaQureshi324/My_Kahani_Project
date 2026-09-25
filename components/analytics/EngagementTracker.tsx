"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Engagement & attention tracking (client-only, fire-and-forget):
 *
 *   - Scroll milestones: 25 / 50 / 75 / 90 / 100% of page height, each
 *     dispatched exactly once per session, throttled via rAF.
 *   - Section attention: sections with tracked IDs that stay >50%
 *     visible for ≥ 3 seconds dispatch section_viewed once, then
 *     unobserve.
 *
 * Renders nothing. No-ops entirely when analytics sinks are absent.
 */

const SCROLL_THRESHOLDS = [25, 50, 75, 90, 100] as const;
const SECTION_IDS = [
  "approach",
  "services",
  "specialties",
  "location",
  "testimonials",
  "pricing",
];
const SECTION_DWELL_MS = 3000;
const SECTION_VISIBILITY_RATIO = 0.5;

export default function EngagementTracker() {
  useEffect(() => {
    // ── Scroll depth (each milestone once) ─────────────────────────
    const fired = new Set<number>();
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const doc = document.documentElement;
        const scrollable =
          doc.scrollHeight - window.innerHeight;
        if (scrollable <= 0) return;
        const percent =
          ((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100;
        const viewPortPercent = (window.scrollY / scrollable) * 100;
        const depth = Math.max(percent, viewPortPercent);
        for (const t of SCROLL_THRESHOLDS) {
          if (depth >= t && !fired.has(t)) {
            fired.add(t);
            trackEvent({
              action: "scroll_depth",
              category: "engagement",
              depth: t,
            });
          }
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // ── Section dwell (≥3s above 50% visibility, once) ─────────────
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const dispatch = (id: string, ms: number) =>
      trackEvent({
        action: "section_viewed",
        category: "engagement",
        section_id: id,
        time_spent_ms: ms,
      });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target;
          const id = el.id;
          if (entry.intersectionRatio >= SECTION_VISIBILITY_RATIO) {
            if (!timers.has(el)) {
              timers.set(
                el,
                setTimeout(() => {
                  dispatch(id, SECTION_DWELL_MS);
                  observer.unobserve(el);
                  timers.delete(el);
                }, SECTION_DWELL_MS),
              );
            }
          } else {
            const t = timers.get(el);
            if (t) {
              clearTimeout(t);
              timers.delete(el);
            }
          }
        }
      },
      { threshold: [0, SECTION_VISIBILITY_RATIO, 0.75] },
    );

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  return null;
}
