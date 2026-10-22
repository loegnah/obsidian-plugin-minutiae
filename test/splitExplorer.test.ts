import { describe, expect, it } from "bun:test";

import {
  filterFilesForFolder,
  getRelativeSubfolder,
  normalizeFolderPath,
  resolveRecentFiles,
} from "../src/feature/splitExplorer";

const sampleFiles = [
  { path: "root-b.md", name: "root-b.md" },
  { path: "root-a.md", name: "root-a.md" },
  { path: "Projects/zeta.md", name: "zeta.md" },
  { path: "Projects/alpha.md", name: "alpha.md" },
  { path: "Projects/Web/index.md", name: "index.md" },
  { path: "Projects/App/main.md", name: "main.md" },
  { path: "Projects-Extra/other.md", name: "other.md" },
  { path: "Archive/2025/note.md", name: "note.md" },
];

describe("normalizeFolderPath", () => {
  it("normalizes root and blank paths to null", () => {
    expect(normalizeFolderPath(null)).toBeNull();
    expect(normalizeFolderPath("")).toBeNull();
    expect(normalizeFolderPath("/")).toBeNull();
    expect(normalizeFolderPath(" /// ")).toBeNull();
  });

  it("strips leading and trailing slashes from folder paths", () => {
    expect(normalizeFolderPath("/Projects/App/")).toBe("Projects/App");
  });
});

describe("filterFilesForFolder", () => {
  it("returns only root-level files when no folder is selected", () => {
    expect(filterFilesForFolder(sampleFiles, null).map((f) => f.path)).toEqual([
      "root-a.md",
      "root-b.md",
    ]);
    expect(filterFilesForFolder(sampleFiles, "/").map((f) => f.path)).toEqual([
      "root-a.md",
      "root-b.md",
    ]);
  });

  it("returns direct files first, then subfolder files for a selected folder without matching sibling prefixes", () => {
    expect(filterFilesForFolder(sampleFiles, "Projects").map((f) => f.path)).toEqual([
      "Projects/alpha.md",
      "Projects/zeta.md",
      "Projects/App/main.md",
      "Projects/Web/index.md",
    ]);
  });

  it("scopes to a selected subfolder", () => {
    expect(filterFilesForFolder(sampleFiles, "Projects/App").map((f) => f.path)).toEqual([
      "Projects/App/main.md",
    ]);
  });
});

describe("getRelativeSubfolder", () => {
  it("returns null for root or direct children and relative subfolder path for nested files", () => {
    expect(getRelativeSubfolder("root-a.md", null)).toBeNull();
    expect(getRelativeSubfolder("Projects/alpha.md", "Projects")).toBeNull();
    expect(getRelativeSubfolder("Projects/App/main.md", "Projects")).toBe("App");
    expect(getRelativeSubfolder("Archive/2025/Q1/note.md", "Archive")).toBe("2025/Q1");
  });
});

describe("resolveRecentFiles", () => {
  it("places active file first, deduplicates, and ignores missing files", () => {
    expect(
      resolveRecentFiles(
        sampleFiles,
        ["deleted.md", "Projects/zeta.md", "root-a.md", "Projects/zeta.md"],
        "root-a.md",
      ).map((f) => f.path),
    ).toEqual(["root-a.md", "Projects/zeta.md"]);
  });
});
