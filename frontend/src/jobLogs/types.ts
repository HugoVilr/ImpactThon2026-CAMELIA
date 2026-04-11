import type { Job, JobStatus } from "../types/domain";

export type JobLogLevel = "info" | "progress" | "warning" | "error";

export type JobLogEntry = {
  id: string;
  timestamp: string;
  message: string;
  level: JobLogLevel;
};

export type JobOutputsPayload = {
  job_id: string;
  status: JobStatus;
  protein_metadata?: ProteinMetadata | null;
  structural_data: StructuralDataOutput;
  biological_data: BiologicalDataOutput;
  logs?: string;
};

export type ProteinMetadata = {
  identified_protein?: string | null;
  uniprot_id?: string | null;
  pdb_id?: string | null;
  protein_name?: string | null;
  organism?: string | null;
  description?: string | null;
  data_source?: string | null;
  plddt_average?: number | null;
  model_type?: string | null;
};

export type StructuralConfidence = {
  plddt_per_residue?: number[];
  plddt_histogram?: Record<string, number>;
  pae_matrix?: number[][];
  mean_pae?: number | null;
  plddt_mean?: number | null;
};

export type StructuralDataOutput = {
  pdb_file?: string | null;
  cif_file?: string | null;
  confidence: StructuralConfidence;
};

export type SecondaryStructurePrediction = {
  helix_percent: number;
  strand_percent: number;
  coil_percent: number;
};

export type SequenceProperties = {
  length: number;
  molecular_weight_kda: number;
  positive_charges: number;
  negative_charges: number;
  cysteine_residues: number;
  aromatic_residues: number;
};

export type BiologicalDataOutput = {
  solubility_score: number;
  solubility_prediction?: string | null;
  instability_index: number;
  stability_status?: string | null;
  toxicity_alerts?: string[];
  allergenicity_alerts?: string[];
  secondary_structure_prediction?: SecondaryStructurePrediction | null;
  sequence_properties?: SequenceProperties | null;
  source?: string | null;
};

export type JobAccountingPayload = {
  job_id: string;
  status: JobStatus;
  accounting: {
    cpu_hours: number;
    gpu_hours: number;
    memory_gb_hours: number;
    total_wall_time_seconds: number;
    cpu_efficiency_percent: number;
    memory_efficiency_percent: number;
    gpu_efficiency_percent?: number | null;
  };
};

export type JobProgressPhase =
  | "init"
  | "queue"
  | "msa"
  | "features"
  | "folding"
  | "complete"
  | "failed"
  | "cancelled";

export type JobProgressViewModel = {
  titleKey: string;
  percent: number;
  indeterminate: boolean;
  currentStep: number;
  totalSteps: number;
  phase: JobProgressPhase;
  toneClass: string;
};

export type JobStatusPayload = Job;
