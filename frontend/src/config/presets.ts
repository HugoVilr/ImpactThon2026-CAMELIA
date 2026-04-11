import type { ResourcePreset, ResourcePresetId } from "../types/domain";

export const resourcePresets: ResourcePreset[] = [
  {
    id: "draft",
    nameKey: "presets.draft.name",
    subtitleKey: "presets.draft.subtitle",
    descriptionKey: "presets.draft.description",
    cpus: 2,
    gpus: 0,
    memoryGb: 8,
    maxRuntimeSeconds: 1200,
  },
  {
    id: "standard",
    nameKey: "presets.standard.name",
    subtitleKey: "presets.standard.subtitle",
    descriptionKey: "presets.standard.description",
    badgeKey: "presets.badge",
    cpus: 8,
    gpus: 1,
    memoryGb: 32,
    maxRuntimeSeconds: 3600,
  },
  {
    id: "precision",
    nameKey: "presets.precision.name",
    subtitleKey: "presets.precision.subtitle",
    descriptionKey: "presets.precision.description",
    cpus: 16,
    gpus: 2,
    memoryGb: 80,
    maxRuntimeSeconds: 7200,
  },
];

export const getPresetById = (id: ResourcePresetId): ResourcePreset => {
  return resourcePresets.find((preset) => preset.id === id) ?? resourcePresets[1];
};
