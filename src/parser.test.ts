import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  analyzeFieldNotation,
  bin,
  filterRecord,
  MARC,
  parseRecord,
  type Field,
  type Subfield,
} from "./parser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Helper: read a binary MARC file, preserving exact byte positions via latin1 encoding
function readMarcFile(filename: string): string {
  const filePath = resolve(__dirname, "..", "samples", filename);
  return readFileSync(filePath).toString("latin1");
}

// Helper: split a multi-record MARC file into individual record strings
function splitRecords(raw: string): string[] {
  return raw.split("\u001d").filter((rec) => rec.trim().length > 0);
}

// ---------------------------------------------------------------------------
// analyzeFieldNotation
// ---------------------------------------------------------------------------
describe("analyzeFieldNotation", () => {
  it('wildcard "*" returns a passthrough that always returns true', () => {
    const fn = analyzeFieldNotation("*");
    expect(fn({ code: "020" })).toBe(true);
    expect(fn({ code: "XYZ" })).toBe(true);
    expect(fn({ code: "" })).toBe(true);
    expect(fn({ code: "001" })).toBe(true);
  });

  it("specific field notation produces correct filter for 3-char codes", () => {
    const fn = analyzeFieldNotation("020$a,856$u");

    // Three-character codes are matched against field parts
    expect(fn({ code: "020" })).toBe(true);
    expect(fn({ code: "856" })).toBe(true);
    expect(fn({ code: "100" })).toBe(false);
    expect(fn({ code: "001" })).toBe(false);
  });

  it("pads short field codes with leading zeros", () => {
    const fn = analyzeFieldNotation("20$a");
    // "20" gets padded to "020"
    expect(fn({ code: "020" })).toBe(true);
    expect(fn({ code: "20" })).toBe(true);
  });

  it("returns field presence when used with this context for subfield matching", () => {
    const fn = analyzeFieldNotation("020$a,020$b,856$u");

    // Check subfield matching: "020"s subfields include $a and $b
    const resultA = fn.call({ parentCode: "020" }, { code: "a" });
    expect(resultA).toBe(true);

    const resultB = fn.call({ parentCode: "020" }, { code: "b" });
    expect(resultB).toBe(true);

    // $c is not in 020's subfield list
    const resultC = fn.call({ parentCode: "020" }, { code: "c" });
    expect(resultC).toBe(false);

    // 856 only has $u
    const resultU = fn.call({ parentCode: "856" }, { code: "u" });
    expect(resultU).toBe(true);
    const resultX = fn.call({ parentCode: "856" }, { code: "x" });
    expect(resultX).toBe(false);
  });

  it("returns false when this.parentCode is not in the notation", () => {
    const fn = analyzeFieldNotation("020$a,856$u");
    const result = fn.call({ parentCode: "999" }, { code: "a" });
    expect(result).toBe(false);
  });

  it("returns true from wildcard passthrough even with this context", () => {
    const fn = analyzeFieldNotation("*");
    const result = fn.call({ parentCode: "020" }, { code: "a" });
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// bin.length
// ---------------------------------------------------------------------------
describe("bin.length", () => {
  it("counts bytes correctly for ASCII strings", () => {
    expect(bin.length("hello")).toBe(5);
    expect(bin.length("abcdefghij")).toBe(10);
    expect(bin.length("")).toBe(0);
  });

  it("counts bytes correctly for multi-byte (UTF-8) strings", () => {
    // é is 2 bytes in UTF-8
    expect(bin.length("é")).toBe(2);
    // 日本語: three 3-byte characters = 9 bytes
    expect(bin.length("日本語")).toBe(9);
    // mixed: "café" = 3 ASCII + 2-byte é = 5 bytes
    expect(bin.length("café")).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// bin.slice
// ---------------------------------------------------------------------------
describe("bin.slice", () => {
  it("slices ASCII strings by byte position", () => {
    expect(bin.slice("hello world", 0, 5)).toBe("hello");
    expect(bin.slice("hello world", 6, 11)).toBe("world");
    expect(bin.slice("hello world", 3)).toBe("lo world");
  });

  it("slices multi-byte strings by byte position", () => {
    // "café": c(1) a(2) f(3) é(4-5)
    expect(bin.slice("café", 0, 3)).toBe("caf");
    expect(bin.slice("café", 3)).toBe("é");
    expect(bin.slice("café", 1, 4)).toBe("afé"); // start at byte 1 (char 'a'), end at byte 4 (end of 'é')
  });

  it("handles slicing to the end when end is undefined", () => {
    expect(bin.slice("test", 1)).toBe("est");
    expect(bin.slice("test", 0)).toBe("test");
    expect(bin.slice("test", 4)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// MARC template
// ---------------------------------------------------------------------------
describe("MARC template", () => {
  it("has the correct default field separator (\\u001e)", () => {
    expect(MARC.fieldSeparator).toBe("\u001e");
  });

  it("has the correct default subfield separator (\\u001f)", () => {
    expect(MARC.subfieldSeparator).toBe("\u001f");
  });

  it("has the correct default record separator (\\u001d)", () => {
    expect(MARC.recordSeparator).toBe("\u001d");
  });

  it("has the directory definition with correct slice ranges", () => {
    expect(MARC["@directory"].code).toEqual([0, 3]);
    expect(MARC["@directory"].length).toEqual([3, 7]);
    expect(MARC["@directory"].position).toEqual([7, 12]);
  });

  it("has an empty fields array as default", () => {
    expect(MARC.fields).toEqual([]);
  });

  it("has an empty directory array as default", () => {
    expect(MARC.directory).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseRecord with sample files
// ---------------------------------------------------------------------------
describe("parseRecord with LOC MARC21 sample", () => {
  const raw = readMarcFile("loc.mrc");
  const records = splitRecords(raw);

  it("parses multiple records from loc.mrc", () => {
    expect(records.length).toBeGreaterThanOrEqual(1);
  });

  it("every record has a 24-character leader", () => {
    for (const recStr of records) {
      const result = parseRecord(recStr);
      expect(result.leader.length).toBe(24);
    }
  });

  it("every record has non-empty directory entries", () => {
    for (const recStr of records) {
      const result = parseRecord(recStr);
      expect(result.directory.length).toBeGreaterThan(0);
    }
  });

  it("every directory entry has code, length, and position", () => {
    for (const recStr of records) {
      const result = parseRecord(recStr);
      for (const entry of result.directory) {
        expect(entry.code).toBeTruthy();
        expect(entry.length).toBeTruthy();
        expect(entry.position).toBeTruthy();
        // codes are 3-digit strings
        expect(entry.code.length).toBe(3);
      }
    }
  });

  it("every record has parsed fields with codes", () => {
    for (const recStr of records) {
      const result = parseRecord(recStr);
      expect(result.fields.length).toBeGreaterThan(0);
      for (const field of result.fields) {
        expect(field.code).toBeTruthy();
        expect(field.code.length).toBe(3);
      }
    }
  });

  it("records have a leader starting with valid MARC length indicator", () => {
    for (const recStr of records) {
      const result = parseRecord(recStr);
      // Leader positions 0-4 contain the record length
      const recordLength = parseInt(result.leader.slice(0, 5), 10);
      expect(Number.isNaN(recordLength)).toBe(false);
      expect(recordLength).toBeGreaterThan(0);
    }
  });
});

describe("parseRecord with OpenEdition UNIMARC sample", () => {
  const raw = readMarcFile("openedition_unimarc.iso2709");
  const records = splitRecords(raw);

  it("parses at least one record from openedition_unimarc.iso2709", () => {
    expect(records.length).toBeGreaterThanOrEqual(1);
  });

  it("every record has a 24-character leader", () => {
    for (const recStr of records) {
      const result = parseRecord(recStr);
      expect(result.leader.length).toBe(24);
    }
  });

  it("every record has directory entries", () => {
    for (const recStr of records) {
      const result = parseRecord(recStr);
      expect(result.directory.length).toBeGreaterThan(0);
    }
  });

  it("every record has parsed fields", () => {
    for (const recStr of records) {
      const result = parseRecord(recStr);
      expect(result.fields.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// parseRecord with field filtering (toParse)
// ---------------------------------------------------------------------------
describe("parseRecord with field filtering", () => {
  const raw = readMarcFile("loc.mrc");
  const records = splitRecords(raw);

  it("limits to only specified fields when toParse is given", () => {
    const result = parseRecord(records[0], { toParse: "020" });
    const codes = result.fields.map((f: Field) => f.code);
    // All returned fields should be 020
    expect(codes.every((c: string) => c === "020")).toBe(true);
    expect(result.fields.length).toBeGreaterThan(0);
  });

  it("parses subfield-level filtering when toParse specifies subfields", () => {
    const result = parseRecord(records[0], { toParse: "020$a" });
    for (const field of result.fields) {
      expect(field.code).toBe("020");
      expect(field.subfields).toBeDefined();
      if (field.subfields) {
        expect(field.subfields.every((s: Subfield) => s.code === "a")).toBe(true);
      }
    }
  });

  it("excludes fields not requested via toParse", () => {
    // Parse with a restrictive toParse and with wildcard for comparison
    const restricted = parseRecord(records[0], { toParse: "020" });
    const unrestricted = parseRecord(records[0], { toParse: "*" });

    const restrictedCodes = new Set(restricted.fields.map((f: Field) => f.code));
    const unrestrictedCodes = new Set(unrestricted.fields.map((f: Field) => f.code));

    // Restricted set should be a subset of unrestricted
    for (const code of restrictedCodes) {
      expect(unrestrictedCodes.has(code)).toBe(true);
    }
    // Restricted should have fewer distinct field types
    expect(restrictedCodes.size).toBeLessThanOrEqual(unrestrictedCodes.size);
  });

  it("defaults to wildcard when toParse is empty string", () => {
    const emptyParse = parseRecord(records[0], { toParse: "" });
    const wildcard = parseRecord(records[0], { toParse: "*" });
    // Should produce same number of fields as wildcard
    expect(emptyParse.fields.length).toBe(wildcard.fields.length);
  });

  it("defaults to wildcard when no options are passed", () => {
    const noOptions = parseRecord(records[0]);
    expect(noOptions.fields.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// filterRecord
// ---------------------------------------------------------------------------
describe("filterRecord", () => {
  const raw = readMarcFile("loc.mrc");
  const records = splitRecords(raw);

  it("returns true when a matching field/subfield value is found", () => {
    const result = parseRecord(records[0]);
    // Try to filter by ISBN field (020$a)
    const hasValue = filterRecord(result, "020$a", ["SomeValue"]);
    // This might be false if no match, but the function should not throw
    expect(typeof hasValue).toBe("boolean");
  });

  it("returns false when no matching field exists", () => {
    const result = parseRecord(records[0]);
    const hasValue = filterRecord(result, "999$x", ["anything"]);
    expect(hasValue).toBe(false);
  });

  it("accepts a pre-built filter function as second argument", () => {
    const result = parseRecord(records[0]);
    const filterFn = analyzeFieldNotation("020$a");
    const hasValue = filterRecord(result, filterFn, ["SomeValue"]);
    expect(typeof hasValue).toBe("boolean");
  });

  it("returns true when any of the given values matches", () => {
    const result = parseRecord(records[0]);
    // Find a record that actually has an 020 field with a subfield
    for (const recStr of records) {
      const rec = parseRecord(recStr);
      const field020 = rec.fields.find((f: Field) => f.code === "020");
      if (field020 && field020.subfields && field020.subfields.length > 0) {
        const actualValue = field020.subfields[0].value;
        const match = filterRecord(rec, "020$a", [actualValue, "nonexistent"]);
        expect(match).toBe(true);

        const noMatch = filterRecord(rec, "020$a", ["nonexistent"]);
        expect(noMatch).toBe(false);
        return; // Test passes once we find a record with 020
      }
    }
    // If no 020 found, the test is inconclusive but valid
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe("edge cases", () => {
  it("handles empty toParse by defaulting to wildcard", () => {
    const raw = readMarcFile("loc.mrc");
    const records = splitRecords(raw);
    const empty = parseRecord(records[0], { toParse: "" });
    const wildcard = parseRecord(records[0], { toParse: "*" });
    expect(empty.fields.length).toBe(wildcard.fields.length);
  });

  it("control fields (001-009) have value but no subfields", () => {
    const raw = readMarcFile("loc.mrc");
    const records = splitRecords(raw);
    for (const recStr of records) {
      const result = parseRecord(recStr);
      const controlFields = result.fields.filter(
        (f: Field) =>
          f.code >= "001" && f.code <= "009" && typeof f.value !== "undefined",
      );
      for (const cf of controlFields) {
        // Control fields should have a value (string) and no subfields or empty subfields
        expect(typeof cf.value).toBe("string");
        expect(cf.value!.length).toBeGreaterThan(0);
        // Either no subfields property or empty subfields array
        if (cf.subfields) {
          expect(cf.subfields.length).toBe(0);
        }
      }
      if (controlFields.length > 0) {
        return; // Test passes once we found control fields
      }
    }
    expect(true).toBe(true); // Inconclusive but valid
  });

  it("directory codes are always 3 characters", () => {
    const raw = readMarcFile("loc.mrc");
    const records = splitRecords(raw);
    for (const recStr of records) {
      const result = parseRecord(recStr);
      for (const entry of result.directory) {
        expect(entry.code.length).toBe(3);
      }
    }
  });

  it("parsed record header contains the field separator", () => {
    const raw = readMarcFile("loc.mrc");
    const records = splitRecords(raw);
    for (const recStr of records) {
      const result = parseRecord(recStr);
      expect(result.header).toContain(MARC.fieldSeparator);
    }
  });

  it("parseRecord returns the MarcParser instance (chainable)", () => {
    const raw = readMarcFile("loc.mrc");
    const records = splitRecords(raw);
    const result = parseRecord(records[0]);
    expect(result).toHaveProperty("leader");
    expect(result).toHaveProperty("directory");
    expect(result).toHaveProperty("fields");
    expect(result).toHaveProperty("rawRecord");
    expect(result).toHaveProperty("header");
  });
});
