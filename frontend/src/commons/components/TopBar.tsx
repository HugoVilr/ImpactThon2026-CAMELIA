import { Bell, CircleHelp, FlaskConical, Eye, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./ui";
import type { LanguageCode } from "../../types/domain";

type CBMode = "none" | "deuteranopia" | "protanopia" | "tritanopia" | "achromatopsia" | "contrast_loss";

const cbModeKeys: CBMode[] = [
  "none",
  "deuteranopia",
  "protanopia",
  "tritanopia",
  "achromatopsia",
  "contrast_loss"
];

type TopBarProps = {
  activeLanguage: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  hideLanguageSelector?: boolean;
};

const languages: LanguageCode[] = ["es", "en", "gl"];

export function TopBar({ activeLanguage, onLanguageChange, hideLanguageSelector = false }: TopBarProps) {
  const { t } = useTranslation();

  const [cbMode, setCbMode] = useState<CBMode>(() => {
    return (localStorage.getItem("cb-mode") as CBMode) || "none";
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Limpiar clases antiguas
    const root = document.documentElement;
    root.classList.remove(
      "mode-deuteranopia",
      "mode-protanopia",
      "mode-tritanopia",
      "mode-achromatopsia",
      "mode-contrast_loss",
      "daltonismo-mode"
    );
    if (cbMode !== "none") {
      root.classList.add(`mode-${cbMode}`);
    }
    localStorage.setItem("cb-mode", cbMode);
  }, [cbMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="relative z-[100] surface-shadow-soft h-16 border-b border-border/50 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-[1160px] items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6 md:gap-8">
          <div className="font-headline text-sm font-extrabold uppercase tracking-[0.18em] text-slate-900 md:text-base">
            BIOHACK LOCALFOLD
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {!hideLanguageSelector ? (
            <div
              role="group"
              aria-label={t("language.label")}
              className="inline-flex items-center rounded-full border border-border bg-card p-1"
            >
              {languages.map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => onLanguageChange(language)}
                  className={cn(
                    "rounded-full px-2 py-1 text-[10px] font-extrabold tracking-[0.08em] text-slate-500 transition",
                    activeLanguage === language && "bg-slate-900 text-white"
                  )}
                >
                  {t(`language.${language}`)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="relative" ref={menuRef}>
            <Button 
              type="button" 
              variant="ghost" 
              className={cn("h-8 gap-2 rounded-full px-3 text-slate-700", cbMode !== "none" && "bg-slate-100 text-slate-900 font-medium")}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title={t("accessibility.colorblindMode")}
              aria-label={t("accessibility.colorblindMode")}
            >
              <Eye className="h-4 w-4" />
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
            
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-card p-1 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t("accessibility.menuLabel")}
                </div>
                {cbModeKeys.map((modeId) => (
                  <button
                    key={modeId}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => {
                      setCbMode(modeId);
                      setIsMenuOpen(false);
                    }}
                  >
                    <span>{t(`accessibility.${modeId === "none" ? "standard" : modeId}`)}</span>
                    {cbMode === modeId && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-700">
            <Bell className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-700">
            <CircleHelp className="h-4 w-4" />
          </Button>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-primary/10 text-primary shadow-sm transition-colors">
            <FlaskConical className="h-4 w-4" />
          </span>
        </div>
      </div>
    </header>
  );
}
