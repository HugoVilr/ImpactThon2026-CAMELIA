import { Bell, CircleHelp, FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { Button } from "./ui";
import type { LanguageCode } from "../../types/domain";

type TopBarProps = {
  activeLanguage: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
};

const languages: LanguageCode[] = ["es", "en", "gl"];

export function TopBar({ activeLanguage, onLanguageChange }: TopBarProps) {
  const { t } = useTranslation();

  return (
    <header className="surface-shadow-soft fixed inset-x-0 top-0 z-50 h-16 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-full w-full max-w-[1320px] items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6 md:gap-8">
          <div className="font-headline text-xs font-extrabold uppercase tracking-[0.18em] text-slate-900 md:text-sm">
            BIOHACK LOCALFOLD
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
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

          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500">
            <Bell className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500">
            <CircleHelp className="h-4 w-4" />
          </Button>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-emerald-100 text-emerald-700 shadow-sm">
            <FlaskConical className="h-4 w-4" />
          </span>
        </div>
      </div>
    </header>
  );
}
