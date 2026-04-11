import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getPresetById } from "../../config/presets";
import { loadDashboard, pollJobStatuses, processUploadFile, submitFoldingJob } from "../actions";
import type {
  ApiHealth,
  FeedbackMessage,
  Job,
  JobFilter,
  ProteinSample,
  ResourcePresetId,
} from "../../types/domain";

export type WorkspaceState = {
  health: ApiHealth | null;
  jobs: Job[];
  samples: ProteinSample[];
  selectedPresetId: ResourcePresetId;
  fastaSequence: string;
  fastaFilename: string;
  loading: boolean;
  isSubmittingJob: boolean;
  jobFilter: JobFilter;
  isUploadModalOpen: boolean;
  isDraggingFile: boolean;
  lastSubmittedJobId: string | null;
  errorMessage: FeedbackMessage | null;
  successMessage: FeedbackMessage | null;
};

const initialState: WorkspaceState = {
  health: null,
  jobs: [],
  samples: [],
  selectedPresetId: "standard",
  fastaSequence: "",
  fastaFilename: "sequence.fasta",
  loading: true,
  isSubmittingJob: false,
  jobFilter: "all",
  isUploadModalOpen: false,
  isDraggingFile: false,
  lastSubmittedJobId: null,
  errorMessage: null,
  successMessage: null,
};

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setSelectedPresetId(state, action: PayloadAction<ResourcePresetId>) {
      state.selectedPresetId = action.payload;
    },
    setFastaSequence(state, action: PayloadAction<string>) {
      state.fastaSequence = action.payload;
    },
    setFastaFilename(state, action: PayloadAction<string>) {
      state.fastaFilename = action.payload;
    },
    setJobFilter(state, action: PayloadAction<JobFilter>) {
      state.jobFilter = action.payload;
    },
    openUploadModal(state) {
      state.isUploadModalOpen = true;
      state.isDraggingFile = false;
    },
    closeUploadModal(state) {
      state.isUploadModalOpen = false;
      state.isDraggingFile = false;
    },
    setIsDraggingFile(state, action: PayloadAction<boolean>) {
      state.isDraggingFile = action.payload;
    },
    applySample(state, action: PayloadAction<number>) {
      const sample = state.samples[action.payload];
      if (!sample) {
        return;
      }

      state.fastaSequence = sample.fasta;
      state.fastaFilename = `${sample.protein_name.replace(/\s+/g, "_")}.fasta`;
      state.successMessage = {
        key: "messages.sampleLoaded",
        params: { name: sample.protein_name },
      };
      state.errorMessage = null;
    },
    dismissMessages(state) {
      state.errorMessage = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDashboard.pending, (state) => {
        state.loading = true;
        state.errorMessage = null;
      })
      .addCase(loadDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.health = action.payload.health;
        const jobsMap = new Map(state.jobs.map((job) => [job.job_id, job]));

        action.payload.jobs.forEach((fetchedJob) => {
          if (jobsMap.has(fetchedJob.job_id)) {
            jobsMap.set(fetchedJob.job_id, {
              ...jobsMap.get(fetchedJob.job_id)!,
              ...fetchedJob,
            });
          } else {
            jobsMap.set(fetchedJob.job_id, fetchedJob);
          }
        });

        state.jobs = Array.from(jobsMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        state.samples = action.payload.samples;

        if (!state.fastaSequence && action.payload.samples.length > 0) {
          const firstSample = action.payload.samples[0];
          state.fastaSequence = firstSample.fasta;
          state.fastaFilename = `${firstSample.protein_name.replace(/\s+/g, "_")}.fasta`;
        }
      })
      .addCase(loadDashboard.rejected, (state, action) => {
        state.loading = false;
        state.health = null;
        state.jobs = [];
        state.errorMessage =
          action.payload ??
          ({
            key: "errors.dashboardLoad",
            params: { detail: "Unknown error" },
          } as FeedbackMessage);
      })
      .addCase(processUploadFile.pending, (state) => {
        state.errorMessage = null;
        state.successMessage = null;
      })
      .addCase(processUploadFile.fulfilled, (state, action) => {
        state.fastaSequence = action.payload.content;
        state.fastaFilename = action.payload.filename;
        state.isUploadModalOpen = false;
        state.isDraggingFile = false;
        state.successMessage = {
          key: "messages.fileLoaded",
          params: { name: action.payload.filename },
        };
      })
      .addCase(processUploadFile.rejected, (state, action) => {
        state.errorMessage = action.payload ?? { key: "errors.uploadRead" };
        state.successMessage = null;
      })
      .addCase(submitFoldingJob.pending, (state) => {
        state.isSubmittingJob = true;
        state.lastSubmittedJobId = null;
        state.errorMessage = null;
        state.successMessage = null;
      })
      .addCase(submitFoldingJob.fulfilled, (state, action) => {
        state.isSubmittingJob = false;
        state.lastSubmittedJobId = action.payload.job_id;
        const preset = getPresetById(action.meta.arg.presetId);
        const fastaFilename = action.meta.arg.fastaFilename.trim() || "sequence.fasta";
        const existingIndex = state.jobs.findIndex((job) => job.job_id === action.payload.job_id);
        const submittedJob: Job = {
          job_id: action.payload.job_id,
          status: action.payload.status,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          gpus: preset.gpus,
          cpus: preset.cpus,
          memory_gb: preset.memoryGb,
          max_runtime_seconds: preset.maxRuntimeSeconds,
          fasta_filename: fastaFilename,
          error_message: null,
        };

        if (existingIndex >= 0) {
          state.jobs[existingIndex] = {
            ...state.jobs[existingIndex],
            ...submittedJob,
          };
        } else {
          state.jobs.unshift(submittedJob);
        }

        state.successMessage = {
          key: "messages.jobSubmitted",
          params: {
            id: action.payload.job_id,
          },
        };
      })
      .addCase(submitFoldingJob.rejected, (state, action) => {
        state.isSubmittingJob = false;
        state.errorMessage =
          action.payload ??
          ({
            key: "errors.jobSubmit",
            params: {
              detail: "Unknown error",
            },
          } as FeedbackMessage);
        state.successMessage = null;
      })
      .addCase(pollJobStatuses.fulfilled, (state, action) => {
        action.payload.forEach((statusUpdate) => {
          const jobIndex = state.jobs.findIndex((job) => job.job_id === statusUpdate.job_id);
          if (jobIndex < 0) {
            return;
          }

          const existingJob = state.jobs[jobIndex];
          if (existingJob.status !== statusUpdate.status) {
            existingJob.status = statusUpdate.status;
          }
          if (statusUpdate.started_at && existingJob.started_at !== statusUpdate.started_at) {
            existingJob.started_at = statusUpdate.started_at;
          }
          if (statusUpdate.completed_at && existingJob.completed_at !== statusUpdate.completed_at) {
            existingJob.completed_at = statusUpdate.completed_at;
          }
          if (statusUpdate.error_message && existingJob.error_message !== statusUpdate.error_message) {
            existingJob.error_message = statusUpdate.error_message;
          }
        });
      });
  },
});

export const {
  applySample,
  closeUploadModal,
  dismissMessages,
  openUploadModal,
  setFastaFilename,
  setFastaSequence,
  setIsDraggingFile,
  setJobFilter,
  setSelectedPresetId,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
