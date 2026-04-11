import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { loadDashboard, processUploadFile } from "../actions";
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
  jobFilter: JobFilter;
  isUploadModalOpen: boolean;
  isDraggingFile: boolean;
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
  jobFilter: "all",
  isUploadModalOpen: false,
  isDraggingFile: false,
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
        state.jobs = action.payload.jobs;
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
