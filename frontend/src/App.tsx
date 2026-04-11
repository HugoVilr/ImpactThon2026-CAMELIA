import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { HomePage } from "./home";
import { JobLogsPage } from "./jobLogs";
import { TestXrPage } from "./test-xr/TestXrPage";

function JobLogsRoute() {
  const { jobId } = useParams<{ jobId: string }>();
  if (!jobId) {
    return <Navigate to="/" replace />;
  }

  return <JobLogsPage jobId={decodeURIComponent(jobId)} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/jobs/:jobId/logs" element={<JobLogsRoute />} />
        <Route path="/test-xr" element={<TestXrPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
