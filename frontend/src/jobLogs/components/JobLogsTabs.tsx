import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import type { JobDetailsTab } from "../jobResultsUtils";

type JobLogsTabsProps = {
  jobId: string;
  activeTab: JobDetailsTab;
  onTabChange: (tab: JobDetailsTab) => void;
  showMeta?: boolean;
};

const tabStyles = "pb-3 text-[15px] font-bold transition-colors";
const tabOrder: JobDetailsTab[] = ["viewer", "compare", "logs"];

const tabRefMap = () => ({
  viewer: null as HTMLButtonElement | null,
  compare: null as HTMLButtonElement | null,
  logs: null as HTMLButtonElement | null,
});

export function JobLogsTabs({ jobId, activeTab, onTabChange, showMeta = true }: JobLogsTabsProps) {
  const { t, i18n } = useTranslation();
  const navRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef(tabRefMap());
  const [tabIndicator, setTabIndicator] = useState({
    left: 0,
    width: 0,
    ready: false,
  });

  const updateTabIndicator = useCallback(() => {
    const nav = navRef.current;
    const activeTabButton = tabRefs.current[activeTab];
    if (!nav || !activeTabButton) {
      return;
    }

    setTabIndicator({
      left: activeTabButton.offsetLeft,
      width: activeTabButton.offsetWidth,
      ready: true,
    });
  }, [activeTab]);

  useLayoutEffect(() => {
    updateTabIndicator();
    const rafId = window.requestAnimationFrame(updateTabIndicator);
    window.addEventListener("resize", updateTabIndicator);
    const canUseResizeObserver = typeof ResizeObserver !== "undefined";
    const resizeObserver = canUseResizeObserver
      ? new ResizeObserver(() => {
          updateTabIndicator();
        })
      : null;

    if (resizeObserver && navRef.current) {
      resizeObserver.observe(navRef.current);
    }
    if (resizeObserver) {
      tabOrder.forEach((tab) => {
        const button = tabRefs.current[tab];
        if (button) {
          resizeObserver.observe(button);
        }
      });
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateTabIndicator);
      resizeObserver?.disconnect();
    };
  }, [updateTabIndicator, i18n.resolvedLanguage, showMeta]);

  return (
    <section className="space-y-3">
      {showMeta ? (
        <p className="font-headline text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          {t("jobLogs.kicker")}
        </p>
      ) : null}

      <nav ref={navRef} className="relative flex items-center gap-7 border-b border-border/60">
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute bottom-0 left-0 h-0.5 bg-primary transition-[transform,width] duration-300 ease-out",
            tabIndicator.ready ? "opacity-100" : "opacity-0"
          )}
          style={{
            width: `${tabIndicator.width}px`,
            transform: `translateX(${tabIndicator.left}px)`,
          }}
        />
        {tabOrder.map((tab) => (
          <button
            key={tab}
            ref={(element) => {
              tabRefs.current[tab] = element;
            }}
            type="button"
            onClick={() => onTabChange(tab)}
            className={cn(
              tabStyles,
              activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(`jobLogs.tabs.${tab}`)}
          </button>
        ))}
      </nav>

      {showMeta ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("jobLogs.jobId", { id: jobId })}
        </p>
      ) : null}
    </section>
  );
}
