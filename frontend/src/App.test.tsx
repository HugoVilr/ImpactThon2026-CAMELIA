import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import App from "./App";

beforeEach(() => {
  const mockResponse = {
    ok: true,
    json: async () => ({ status: "ok", service: "backend" })
  } as Response;

  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders the main title", async () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /camelia monorepo/i })).toBeInTheDocument();
    expect(await screen.findByText(/^ok$/i)).toBeInTheDocument();
  });
});
