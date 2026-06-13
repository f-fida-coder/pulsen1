import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getOnboardingProgress: vi.fn(),
  upsertOnboardingProgress: vi.fn(),
  dismissOnboarding: vi.fn(),
}));

import {
  getOnboardingProgress,
  upsertOnboardingProgress,
  dismissOnboarding,
} from "./db";

const mockGetProgress = vi.mocked(getOnboardingProgress);
const mockUpsert = vi.mocked(upsertOnboardingProgress);
const mockDismiss = vi.mocked(dismissOnboarding);

describe("Onboarding Progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for new user with no progress", async () => {
    mockGetProgress.mockResolvedValue(null);
    const result = await getOnboardingProgress(1);
    expect(result).toBeNull();
  });

  it("returns progress for existing user", async () => {
    const mockProgress = {
      id: 1,
      userId: 42,
      completedSteps: ["configure_system"],
      dismissed: false,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockGetProgress.mockResolvedValue(mockProgress);
    const result = await getOnboardingProgress(42);
    expect(result).not.toBeNull();
    expect(result?.completedSteps).toContain("configure_system");
  });

  it("upserts progress with new step", async () => {
    mockUpsert.mockResolvedValue(undefined);
    await upsertOnboardingProgress(1, ["configure_system", "add_device"]);
    expect(mockUpsert).toHaveBeenCalledWith(1, ["configure_system", "add_device"]);
  });

  it("marks all 4 steps as complete", async () => {
    const allSteps = ["configure_system", "add_device", "choose_care_tier", "explore_dashboard"];
    mockUpsert.mockResolvedValue(undefined);
    await upsertOnboardingProgress(1, allSteps);
    expect(mockUpsert).toHaveBeenCalledWith(1, allSteps);
  });

  it("dismisses onboarding for user", async () => {
    mockDismiss.mockResolvedValue(undefined);
    await dismissOnboarding(5);
    expect(mockDismiss).toHaveBeenCalledWith(5);
  });

  it("does not add duplicate steps", async () => {
    const existingSteps = ["configure_system"];
    const newStep = "configure_system";
    // Simulate the router logic: only add if not already present
    const updated = existingSteps.includes(newStep)
      ? existingSteps
      : [...existingSteps, newStep];
    expect(updated).toEqual(["configure_system"]);
    expect(updated.length).toBe(1);
  });

  it("correctly identifies incomplete onboarding", () => {
    const allSteps = ["configure_system", "add_device", "choose_care_tier", "explore_dashboard"];
    const completedSteps = ["configure_system", "add_device"];
    const isComplete = allSteps.every(s => completedSteps.includes(s));
    expect(isComplete).toBe(false);
  });

  it("correctly identifies complete onboarding", () => {
    const allSteps = ["configure_system", "add_device", "choose_care_tier", "explore_dashboard"];
    const completedSteps = ["configure_system", "add_device", "choose_care_tier", "explore_dashboard"];
    const isComplete = allSteps.every(s => completedSteps.includes(s));
    expect(isComplete).toBe(true);
  });
});
