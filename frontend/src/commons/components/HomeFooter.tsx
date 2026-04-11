import { useTranslation } from "react-i18next";

export function HomeFooter() {
  const { t } = useTranslation();

  return (
    <footer className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-border/50 pt-7 md:flex-row md:items-center">
      <div className="flex items-center gap-3">
        <strong className="font-headline text-[1.2rem] font-bold tracking-[-0.03em] text-slate-900">{t("footer.brand")}</strong>
        <span className="text-xs text-muted-foreground">{t("footer.copy")}</span>
      </div>

      <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">
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
