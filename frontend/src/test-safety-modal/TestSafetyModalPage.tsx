import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { SafetyFindingsModal, type SafetyFinding, type SafetyFindingCategory } from "../commons/components";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "../commons/components/ui";
import { apiUrl } from "../store/actions/workspaceActions";

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
};

const asString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const parseHttpError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
  } catch {
    // Ignore malformed error responses.
  }

  return `HTTP ${response.status}`;
};

const looksCritical = (value: string): boolean => {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("critical") ||
    normalized.includes("high") ||
    normalized.includes("severe") ||
    normalized.includes("error")
  );
};

const extractArraysByKeys = (value: unknown, candidateKeys: string[], depth = 0): unknown[][] => {
  if (depth > 5) {
    return [];
  }

  const record = asRecord(value);
  if (!record) {
    return [];
  }

  const found: unknown[][] = [];

  Object.entries(record).forEach(([key, entry]) => {
    const normalizedKey = key.toLowerCase();
    if (candidateKeys.includes(normalizedKey) && Array.isArray(entry)) {
      found.push(entry);
    }

    const nested = asRecord(entry);
    if (nested) {
      found.push(...extractArraysByKeys(nested, candidateKeys, depth + 1));
    }
  });

  return found;
};

const normalizeFinding = (
  item: unknown,
  category: SafetyFindingCategory,
  index: number
): SafetyFinding | null => {
  if (typeof item === "string" && item.trim()) {
    return {
      id: `${category}-${index}`,
      category,
      severity: looksCritical(item) ? "critical" : "warning",
      title: item.trim(),
      description: "",
    };
  }

  const record = asRecord(item);
  if (!record) {
    return null;
  }

  const title =
    asString(record.title) ??
    asString(record.name) ??
    asString(record.alert) ??
    asString(record.summary) ??
    asString(record.message) ??
    asString(record.type);

  const description =
    asString(record.description) ??
    asString(record.detail) ??
    asString(record.reason) ??
    (title && asString(record.message) !== title ? asString(record.message) : null) ??
    "";

  if (!title) {
    return null;
  }

  const severityHint =
    asString(record.severity) ?? asString(record.level) ?? asString(record.risk) ?? `${title} ${description}`;

  return {
    id: `${category}-${index}`,
    category,
    severity: looksCritical(severityHint) ? "critical" : "warning",
    title,
    description,
  };
};

const extractSafetyFindings = (outputsPayload: unknown): SafetyFinding[] => {
  const toxicityArrays = extractArraysByKeys(outputsPayload, [
    "toxicity_alerts",
    "toxicityalerts",
    "toxicity",
    "toxic_alerts",
    "toxicalerts",
  ]);
  const allergenicityArrays = extractArraysByKeys(outputsPayload, [
    "allergenicity_alerts",
    "allergenicityalerts",
    "allergenicity",
    "allergen_alerts",
    "allergenalerts",
    "allergy_alerts",
    "allergyalerts",
  ]);

  const normalizedToxicity = toxicityArrays
    .flat()
    .map((item, index) => normalizeFinding(item, "toxicity", index))
    .filter((entry): entry is SafetyFinding => entry !== null);

  const normalizedAllergenicity = allergenicityArrays
    .flat()
    .map((item, index) => normalizeFinding(item, "allergenicity", index))
    .filter((entry): entry is SafetyFinding => entry !== null);

  const deduped = new Map<string, SafetyFinding>();
  [...normalizedToxicity, ...normalizedAllergenicity].forEach((entry) => {
    const key = `${entry.category}|${entry.title}|${entry.description}`;
    if (!deduped.has(key)) {
      deduped.set(key, entry);
    }
  });

  return Array.from(deduped.values());
};

export function TestSafetyModalPage() {
  const [jobId, setJobId] = useState("job_submitted_123");
  const [findings, setFindings] = useState<SafetyFinding[]>([]);
  const [isLoadingFindings, setIsLoadingFindings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadFindingsFromApi = async () => {
    const trimmedJobId = jobId.trim();
    if (!trimmedJobId) {
      setError("Introduce un job_id para consultar /jobs/:job_id/outputs.");
      return;
    }

    setIsLoadingFindings(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/jobs/${encodeURIComponent(trimmedJobId)}/outputs`);
      if (!response.ok) {
        throw new Error(await parseHttpError(response));
      }

      const payload = (await response.json()) as unknown;
      const parsedFindings = extractSafetyFindings(payload);

      setFindings(parsedFindings);
      setIsModalOpen(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? `No se pudieron cargar alertas de seguridad: ${requestError.message}`
          : "No se pudieron cargar alertas de seguridad."
      );
    } finally {
      setIsLoadingFindings(false);
    }
  };

  return (
    <>
      <main className="page-enter mx-auto flex min-h-screen w-full max-w-[1320px] items-center px-4 py-12 md:px-6">
        <Card className="surface-shadow mx-auto w-full max-w-3xl border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ShieldAlert className="h-6 w-6 text-primary" />
              Safety Modal Test
            </CardTitle>
            <CardDescription>
              Route de validación visual para el modal de análisis de seguridad.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Carga los findings desde <code>/jobs/:job_id/outputs</code> y abre el modal.
            </p>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Job ID</span>
              <input
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                value={jobId}
                onChange={(event) => setJobId(event.target.value)}
                placeholder="job_submitted_123"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => void loadFindingsFromApi()} disabled={isLoadingFindings}>
                {isLoadingFindings ? "Loading..." : "Load Findings From API"}
              </Button>
              {findings.length > 0 ? (
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(true)}>
                  Reopen Modal
                </Button>
              ) : null}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
        </Card>
      </main>

      <SafetyFindingsModal
        isOpen={isModalOpen}
        findings={findings}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
