import { useTranslation } from "react-i18next";

export function HomeFooter() {
  const { t } = useTranslation();

  return (
    <footer className="mt-4 flex flex-col items-start justify-between gap-4 border-t border-border/70 pt-6 md:flex-row md:items-center">
      <div className="flex items-center gap-3">
        <strong className="font-headline text-base font-bold text-slate-900">{t("footer.brand")}</strong>
        <span className="text-xs text-muted-foreground">{t("footer.copy")}</span>
      </div>

      <div className="flex items-center gap-5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        <a href="#" className="transition hover:text-primary">
          {t("footer.privacy")}
        </a>
        <a href="#" className="transition hover:text-primary">
          {t("footer.terms")}
        </a>
        <a href="#" className="transition hover:text-primary">
          {t("footer.systemStatus")}
        </a>
      </div>
    </footer>
  );
}
