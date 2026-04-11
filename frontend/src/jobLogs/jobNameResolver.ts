import type { Job } from "../types/domain";
import type { JobOutputsPayload } from "./types";

export const resolveProteinNameFromOutputs = (outputs: JobOutputsPayload | null | undefined): string | null => {
  return outputs?.protein_metadata?.protein_name?.trim() || outputs?.protein_metadata?.identified_protein?.trim() || null;
};

export const enrichJobsWithResolvedNames = async (
  jobs: Job[],
  fetchOutputs: (jobId: string) => Promise<JobOutputsPayload | null>
): Promise<Job[]> => {
  const unresolvedCompletedJobs = jobs.filter((job) => job.status === "COMPLETED" && !job.display_name?.trim());
  if (unresolvedCompletedJobs.length === 0) {
    return jobs;
  }

  const resolvedEntries = await Promise.all(
    unresolvedCompletedJobs.map(async (job) => {
      try {
        const outputs = await fetchOutputs(job.job_id);
        const resolvedName = resolveProteinNameFromOutputs(outputs);
        return resolvedName ? [job.job_id, resolvedName] as const : null;
      } catch {
        return null;
      }
    })
  );

  const resolvedNameByJobId = new Map(
    resolvedEntries.filter((entry): entry is readonly [string, string] => entry !== null)
  );

  if (resolvedNameByJobId.size === 0) {
    return jobs;
  }

  return jobs.map((job) =>
    resolvedNameByJobId.has(job.job_id)
      ? {
          ...job,
          display_name: resolvedNameByJobId.get(job.job_id)!,
        }
      : job
  );
};
