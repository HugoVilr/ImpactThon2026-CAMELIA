import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAnimeReveal } from "../animations";
import type { FeedbackMessage } from "../../types/domain";

type StatusBannersProps = {
  errorMessage: FeedbackMessage | null;
  successMessage: FeedbackMessage | null;
};

export function StatusBanners({ errorMessage, successMessage }: StatusBannersProps) {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const animationKey = useMemo(
    () => `${errorMessage?.key ?? "no-error"}|${successMessage?.key ?? "no-success"}`,
    [errorMessage?.key, successMessage?.key]
  );

  useAnimeReveal(wrapperRef, {
    selector: ":scope > [data-anime='status-banner']",
    dependencyKey: animationKey,
    delayStep: 0,
    duration: 280,
    translateY: 20,
    startScale: 0.995,
  });

  return (
    <div ref={wrapperRef}>
      {errorMessage ? (
        <p data-anime="status-banner" className="fixed bottom-4 left-1/2 z-[70] w-[min(92vw,760px)] -translate-x-1/2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-xl">
          {t(errorMessage.key, errorMessage.params)}
        </p>
      ) : null}
      {successMessage ? (
        <p data-anime="status-banner" className="fixed bottom-4 left-1/2 z-[70] w-[min(92vw,760px)] -translate-x-1/2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 shadow-xl">
          {t(successMessage.key, successMessage.params)}
        </p>
      ) : null}
    </div>
  );
}
