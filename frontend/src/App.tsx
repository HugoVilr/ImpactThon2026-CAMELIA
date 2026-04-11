import { HomePage } from "./home";
import { JobLogsPage } from "./jobLogs";

const logsPathPattern = /^\/jobs\/([^/]+)\/logs\/?$/;

export default function App() {
  const pathMatch = window.location.pathname.match(logsPathPattern);
  if (pathMatch) {
    return <JobLogsPage jobId={decodeURIComponent(pathMatch[1])} />;
  }

  return <HomePage />;
}
