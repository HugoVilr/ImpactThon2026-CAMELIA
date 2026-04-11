import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./home";
import { TestXrPage } from "./test-xr/TestXrPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test-xr" element={<TestXrPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
