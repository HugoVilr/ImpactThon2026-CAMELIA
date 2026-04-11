import { Microscope, Server, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { resourcePresets } from "../../config/presets";
import { Card, CardContent, CardHeader, CardTitle } from "../../commons/components/ui";
import { cn } from "../../lib/utils";
import type { ResourcePresetId } from "../../types/domain";

type PresetPanelProps = {
  selectedPresetId: ResourcePresetId;
  onSelectPreset: (presetId: ResourcePresetId) => void;
};

const iconByPreset = {
  draft: Zap,
  standard: Microscope,
  precision: Server,
} as const;

export function PresetPanel({ selectedPresetId, onSelectPreset }: PresetPanelProps) {
  const { t } = useTranslation();

  return (
    <Card data-testid="preset-panel" className="border-0 bg-transparent shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{t("presets.title")}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {resourcePresets.map((preset) => {
          const Icon = iconByPreset[preset.id];

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              className={cn(
                "relative w-full overflow-hidden rounded-lg border px-3 py-3 text-left shadow-sm transition-all duration-200 ease-out",
                "hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-primary/20",
                selectedPresetId === preset.id
                  ? "border-primary/60 bg-emerald-50 shadow-emerald-200/70"
                  : "border-border/70 bg-card hover:border-slate-300"
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 rounded-lg p-1.5",
                      selectedPresetId === preset.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">{t(preset.nameKey)}</h3>
                    <p className={cn("mt-0.5 text-[10px]", selectedPresetId === preset.id ? "text-primary" : "text-muted-foreground")}>
                      {t(preset.subtitleKey)}
                    </p>
                  </div>
                </div>
                {preset.badgeKey ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold tracking-wide text-primary-foreground">
                    {t(preset.badgeKey)}
                  </span>
                ) : null}
              </div>

              <p className="text-[10px] leading-relaxed text-slate-500">{t(preset.descriptionKey)}</p>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
