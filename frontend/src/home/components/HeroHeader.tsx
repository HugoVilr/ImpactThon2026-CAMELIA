import { useTranslation } from "react-i18next";

export function HeroHeader() {
  const { t } = useTranslation();

  return (
    <section className="space-y-2">
      <p className="font-headline text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
        {t("hero.kicker")}
      </p>
      <h1 className="font-headline text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl">
        {t("hero.title")}
      </h1>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{t("hero.description")}</p>
    </section>
  );
}
