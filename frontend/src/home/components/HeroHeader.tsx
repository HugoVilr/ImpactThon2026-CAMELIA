import { useTranslation } from "react-i18next";

export function HeroHeader() {
  const { t } = useTranslation();

  return (
    <section className="space-y-1">
      <p className="font-headline text-[13px] font-semibold uppercase tracking-[0.34em] text-primary">
        {t("hero.kicker")}
      </p>
      <h2 className="font-headline text-2xl font-bold text-slate-900 md:text-3xl">
        {t("sequence.title")}
      </h2>
    </section>
  );
}
