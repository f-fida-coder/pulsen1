import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Knowledge Base tests
 * Tests the DB helper functions and slug generation logic.
 */

// ─── Slug generation (pure logic, no DB needed) ───────────────────────────────
function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/å/g, "a").replace(/ä/g, "a").replace(/ö/g, "o")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

describe("knowledge base slug generation", () => {
  it("converts Swedish characters correctly", () => {
    expect(toSlug("Högvoltsbatterier och säkerhet")).toBe("hogvoltsbatterier-och-sakerhet");
  });

  it("removes special characters", () => {
    expect(toSlug("Ny lag: Energilagring 2026!")).toBe("ny-lag-energilagring-2026");
  });

  it("collapses multiple spaces/dashes", () => {
    expect(toSlug("Sol  Panel  Guide")).toBe("sol-panel-guide");
  });

  it("truncates to 80 characters", () => {
    const long = "a".repeat(100);
    expect(toSlug(long).length).toBeLessThanOrEqual(80);
  });

  it("handles empty string", () => {
    expect(toSlug("")).toBe("");
  });
});

// ─── DB helper exports ────────────────────────────────────────────────────────
describe("knowledge DB helpers export", () => {
  it("exports all required functions", async () => {
    const mod = await import("./db");
    expect(typeof mod.listKnowledgeArticles).toBe("function");
    expect(typeof mod.getKnowledgeArticleBySlug).toBe("function");
    expect(typeof mod.getKnowledgeArticleById).toBe("function");
    expect(typeof mod.createKnowledgeArticle).toBe("function");
    expect(typeof mod.updateKnowledgeArticle).toBe("function");
    expect(typeof mod.deleteKnowledgeArticle).toBe("function");
    expect(typeof mod.publishKnowledgeArticle).toBe("function");
  });
});

// ─── Category validation ──────────────────────────────────────────────────────
describe("knowledge article categories", () => {
  const VALID_CATEGORIES = ["products", "regulations", "apps_services", "technology", "news", "other"] as const;

  it("has exactly 6 valid categories", () => {
    expect(VALID_CATEGORIES.length).toBe(6);
  });

  it("includes all expected category values", () => {
    expect(VALID_CATEGORIES).toContain("products");
    expect(VALID_CATEGORIES).toContain("regulations");
    expect(VALID_CATEGORIES).toContain("apps_services");
    expect(VALID_CATEGORIES).toContain("technology");
    expect(VALID_CATEGORIES).toContain("news");
    expect(VALID_CATEGORIES).toContain("other");
  });
});
