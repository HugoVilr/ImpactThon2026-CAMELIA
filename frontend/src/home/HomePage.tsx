import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAnimePressables, useAnimeReveal } from "../commons/animations";
import { HomeFooter, StatusBanners, TopBar } from "../commons/components";
import { HeroHeader, JobsSection, PresetPanel, SequencePanel, UploadModal } from "./components";
import { loadDashboard, pollJobStatuses, processUploadFile, submitFoldingJob } from "../store/actions";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  closeUploadModal,
  dismissMessages,
  openUploadModal,
  setFastaSequence,
  setIsDraggingFile,
  setJobFilter,
  setSelectedPresetId,
} from "../store/slices";
import type { LanguageCode } from "../types/domain";
import { isValidFasta, localeForLanguage, resolveLanguage } from "./homeUtils";

export function HomePage() {
  const dispatch = useAppDispatch();
  const { i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pageRef = useRef<HTMLElement | null>(null);

  const {
    jobs,
    selectedPresetId,
    fastaSequence,
    fastaFilename,
    loading,
    isSubmittingJob,
    jobFilter,
    isUploadModalOpen,
    isDraggingFile,
    errorMessage,
    successMessage,
  } = useAppSelector((state) => state.workspace);

  const filteredJobs = useMemo(() => {
    if (jobFilter === "running") {
      return jobs.filter((job) => job.status === "RUNNING" || job.status === "PENDING");
    }

    if (jobFilter === "completed") {
      return jobs.filter((job) => job.status !== "RUNNING" && job.status !== "PENDING");
    }

    return jobs;
  }, [jobFilter, jobs]);

  const activeJobIds = useMemo(
    () =>
      jobs
        .filter((job) => job.status === "PENDING" || job.status === "RUNNING")
        .map((job) => job.job_id),
    [jobs]
  );
  const activeJobIdsKey = activeJobIds.join("|");

  useEffect(() => {
    void dispatch(loadDashboard());
  }, [dispatch]);

  useEffect(() => {
    if (activeJobIds.length === 0) {
      return;
    }

    void dispatch(pollJobStatuses({ jobIds: activeJobIds }));
    const interval = window.setInterval(() => {
      void dispatch(pollJobStatuses({ jobIds: activeJobIds }));
    }, 3000);

    return () => window.clearInterval(interval);
  }, [dispatch, activeJobIds, activeJobIdsKey]);

  useEffect(() => {
    if (!errorMessage && !successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      dispatch(dismissMessages());
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [dispatch, errorMessage, successMessage]);

  const activeLanguage = resolveLanguage(i18n.resolvedLanguage ?? i18n.language);
  const locale = localeForLanguage(activeLanguage);

  const handleLanguageChange = (language: LanguageCode) => {
    void i18n.changeLanguage(language);
  };

  const isFastaSequenceValid = isValidFasta(fastaSequence);

  const handleRunFolding = async () => {
    const result = await dispatch(
      submitFoldingJob({
        fastaSequence,
        fastaFilename,
        presetId: selectedPresetId,
      })
    );

    if (submitFoldingJob.fulfilled.match(result)) {
      void dispatch(loadDashboard());
    }
  };

  useAnimeReveal(pageRef, {
    selector: ":scope > *",
    delayStep: 90,
    duration: 560,
    translateY: 18,
  });

  useAnimePressables(pageRef);

  return (
    <>
      <TopBar activeLanguage={activeLanguage} onLanguageChange={handleLanguageChange} />

      <main ref={pageRef} className="mx-auto w-full max-w-[1200px] space-y-8 px-4 pb-10 pt-8 md:px-5">
        <HeroHeader />

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_360px]">
          <SequencePanel
            fastaSequence={fastaSequence}
            isSubmittingJob={isSubmittingJob}
            isRunDisabled={!isFastaSequenceValid}
            onOpenUploadModal={() => dispatch(openUploadModal())}
            onRunFolding={handleRunFolding}
            onSequenceChange={(value) => dispatch(setFastaSequence(value))}
          />

          <PresetPanel
            selectedPresetId={selectedPresetId}
            onSelectPreset={(presetId) => dispatch(setSelectedPresetId(presetId))}
          />
        </div>

        <JobsSection
          locale={locale}
          loading={loading}
          filteredJobs={filteredJobs}
          jobFilter={jobFilter}
          onFilterChange={(filter) => dispatch(setJobFilter(filter))}
        />

        <HomeFooter />
        <StatusBanners errorMessage={errorMessage} successMessage={successMessage} />
      </main>

      <UploadModal
        isOpen={isUploadModalOpen}
        isDraggingFile={isDraggingFile}
        fileInputRef={fileInputRef}
        onClose={() => dispatch(closeUploadModal())}
        onSetDragging={(isDragging) => dispatch(setIsDraggingFile(isDragging))}
        onSelectFile={(file) => {
          void dispatch(processUploadFile(file));
        }}
      />
    </>
  );
}
