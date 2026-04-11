import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { HomeFooter, StatusBanners, TopBar } from "../commons/components";
import { HeroHeader, JobsSection, PresetPanel, SequencePanel, UploadModal } from "./components";
import { loadDashboard, processUploadFile } from "../store/actions";
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
import { localeForLanguage, resolveLanguage } from "./homeUtils";

export function HomePage() {
  const dispatch = useAppDispatch();
  const { i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    jobs,
    selectedPresetId,
    fastaSequence,
    loading,
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
      return jobs.filter((job) => job.status === "COMPLETED");
    }

    return jobs;
  }, [jobFilter, jobs]);

  useEffect(() => {
    void dispatch(loadDashboard());
  }, [dispatch]);

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

  return (
    <>
      <TopBar activeLanguage={activeLanguage} onLanguageChange={handleLanguageChange} />

      <main className="page-enter mx-auto w-full max-w-[1320px] space-y-8 px-4 pb-10 pt-24 md:px-6">
        <HeroHeader />

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_360px]">
          <SequencePanel
            fastaSequence={fastaSequence}
            onOpenUploadModal={() => dispatch(openUploadModal())}
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
