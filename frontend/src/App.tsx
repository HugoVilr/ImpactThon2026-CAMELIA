import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { HomePage } from "./home";
import { JobDetailsPage } from "./jobLogs";
import { TestXrPage } from "./test-xr/TestXrPage";

function JobDetailsRoute() {
  const { jobId } = useParams<{ jobId: string }>();
  if (!jobId) {
    return <Navigate to="/" replace />;
  }

  return <JobDetailsPage jobId={decodeURIComponent(jobId)} />;
}

function JobDetailsLogsRoute() {
  const { jobId } = useParams<{ jobId: string }>();
  if (!jobId) {
    return <Navigate to="/" replace />;
  }

  return <JobDetailsPage jobId={decodeURIComponent(jobId)} initialTab="logs" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/jobs/:jobId" element={<JobDetailsRoute />} />
        <Route path="/jobs/:jobId/logs" element={<JobDetailsLogsRoute />} />
        <Route path="/test-xr" element={<TestXrPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
