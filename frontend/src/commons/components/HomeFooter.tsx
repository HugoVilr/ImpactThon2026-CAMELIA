import { useTranslation } from "react-i18next";
import logoCamelia from "../../../logo-camelia-top.svg";

export function HomeFooter() {
  const { t } = useTranslation();

  return (
    <footer className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-7 md:flex-row relative">
      <div className="flex items-center justify-start gap-3 w-full md:w-1/3">
        <strong className="font-headline text-[1.2rem] font-bold tracking-[-0.03em] text-slate-900">{t("footer.brand")}</strong>
        <span className="text-xs text-muted-foreground">{t("footer.copy")}</span>
      </div>

      <div className="flex justify-center w-full md:w-1/3">
        <img src={logoCamelia} alt="Camelia Logo" className="h-10 object-contain" />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-6 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700 w-full md:w-1/3">
        <a href="#" className="anime-pressable transition hover:text-primary">
          {t("footer.privacy")}
        </a>
        <a href="#" className="anime-pressable transition hover:text-primary">
          {t("footer.terms")}
        </a>
        <a href="#" className="anime-pressable transition hover:text-primary">
          {t("footer.systemStatus")}
        </a>
        <span className="font-headline text-sm font-extrabold uppercase tracking-[0.18em] text-slate-900 ml-2">
          BIOHACK
        </span>
      </div>
    </footer>
  );
}
