import { describe, expect, it } from "bun:test";

import { getNoteTypeFromFrontmatter, normalizeNoteType } from "../src/feature/noteType";

describe("normalizeNoteType", () => {
  it("trims plain strings and rejects blanks", () => {
    expect(normalizeNoteType(" book ")).toBe("book");
    expect(normalizeNoteType("   ")).toBeNull();
    expect(normalizeNoteType(42)).toBeNull();
    expect(normalizeNoteType(null)).toBeNull();
  });

  it("uses first non-blank entry of a list", () => {
    expect(normalizeNoteType(["  ", "essay", "book"])).toBe("essay");
    expect(normalizeNoteType(["", "  "])).toBeNull();
  });
});

describe("getNoteTypeFromFrontmatter", () => {
  it("reads the type property only", () => {
    expect(getNoteTypeFromFrontmatter({ type: "book" })).toBe("book");
    expect(getNoteTypeFromFrontmatter({ Type: "book" })).toBeNull();
    expect(getNoteTypeFromFrontmatter({})).toBeNull();
    expect(getNoteTypeFromFrontmatter(null)).toBeNull();
  });
});
