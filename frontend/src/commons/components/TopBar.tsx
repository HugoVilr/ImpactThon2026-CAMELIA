import { useRef } from "react";
import { Bell, CircleHelp, FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAnimePressables, useAnimeReveal } from "../animations";
import { cn } from "../../lib/utils";
import { Button } from "./ui";
import type { LanguageCode } from "../../types/domain";

type TopBarProps = {
  activeLanguage: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  hideLanguageSelector?: boolean;
};

const languages: LanguageCode[] = ["es", "en", "gl"];

export function TopBar({ activeLanguage, onLanguageChange, hideLanguageSelector = false }: TopBarProps) {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLElement | null>(null);
  const activeLanguageIndex = Math.max(0, languages.indexOf(activeLanguage));

  useAnimeReveal(headerRef, {
    selector: "[data-anime='topbar-item']",
    delayStep: 95,
    duration: 520,
    startScale: 0.997,
  });

  useAnimePressables(headerRef, {
    selector: ".anime-pressable, [data-anime='pressable']",
  });

  return (
    <header ref={headerRef} className="surface-shadow-soft h-16 border-b border-border/50 bg-white/95 backdrop-blur">
      <div className="flex h-full w-full items-center justify-between px-3 sm:px-5 md:px-7 xl:px-10">
        <div className="flex items-center gap-6 md:gap-8">
          <Link
            to="/"
            data-anime="topbar-item"
            className="font-headline text-sm font-extrabold uppercase tracking-[0.18em] text-slate-900 transition hover:text-primary md:text-base"
          >
            BIOHACK LOCALFOLD
          </Link>
        </div>

        <div data-anime="topbar-item" className="flex items-center gap-2 md:gap-3">
          {!hideLanguageSelector ? (
            <div
              role="group"
              aria-label={t("language.label")}
              className="relative inline-grid grid-cols-3 items-center rounded-full border border-border bg-card p-1"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1 top-1 h-7 w-7 rounded-full bg-slate-900 transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(calc(${activeLanguageIndex} * 100%))`,
                }}
              />
              {languages.map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => onLanguageChange(language)}
                  className={cn(
                    "relative z-[1] grid h-7 w-7 place-items-center rounded-full text-[10px] font-extrabold tracking-[0.08em] transition-colors duration-200",
                    activeLanguage === language ? "text-white" : "text-slate-500"
                  )}
                >
                  {t(`language.${language}`)}
                </button>
              ))}
            </div>
          ) : null}

          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-700">
            <Bell className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-700">
            <CircleHelp className="h-4 w-4" />
          </Button>
          <span data-anime="pressable" className="grid h-8 w-8 place-items-center rounded-full border border-border bg-emerald-100 text-emerald-700 shadow-sm">
            <FlaskConical className="h-4 w-4" />
          </span>
        </div>
      </div>
    </header>
  );
}
