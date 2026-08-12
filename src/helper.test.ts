import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseRecord, type Field } from "./parser.js";
import {
  explainField,
  explainRecord,
  formats,
  searchField,
} from "./helper.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readMarcFile(filename: string): string {
  const filePath = resolve(__dirname, "..", "samples", filename);
  return readFileSync(filePath).toString("latin1");
}

function splitRecords(raw: string): string[] {
  return raw.split("\u001d").filter((rec) => rec.trim().length > 0);
}

// ---------------------------------------------------------------------------
// searchField
// ---------------------------------------------------------------------------

describe("searchField", () => {
  describe("with MARC21 format", () => {
    it('returns field codes and descriptions matching "author"', async () => {
      const results = await searchField("author", "marc21");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("code");
      expect(results[0]).toHaveProperty("value");

      // Verify field codes are MARC tags (3 digits)
      const hasFieldTag = results.some(
        (r) => r.code.length === 3 && /^\d{3}$/.test(r.code),
      );
      expect(hasFieldTag).toBe(true);

      // Verify results actually contain the search term
      const allMatch = results.every(
        (r) =>
          r.value.toLowerCase().includes("author") ||
          r.code.toLowerCase().includes("author"),
      );
      expect(allMatch).toBe(true);
    });

    it("returns field definitions without duplicates", async () => {
      const results = await searchField("personal name", "marc21");

      const codes = results.map((r) => r.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe("with UNIMARC format", () => {
    it('returns French-language results matching "auteur"', async () => {
      const results = await searchField("auteur", "unimarc");

      expect(results.length).toBeGreaterThan(0);

      // At least one result should contain "auteur" (case-insensitive)
      const hasFrench = results.some((r) =>
        r.value.toLowerCase().includes("auteur"),
      );
      expect(hasFrench).toBe(true);

      // Verify structure of each result
      for (const result of results) {
        expect(result).toHaveProperty("code");
        expect(result).toHaveProperty("value");
        expect(typeof result.code).toBe("string");
        expect(typeof result.value).toBe("string");
      }
    });
  });

  describe("with invalid format", () => {
    it("throws an Error for a non-existent format", async () => {
      await expect(searchField("anything", "nonexistent")).rejects.toThrow(
        /No such format/,
      );
    });
  });
});

// ---------------------------------------------------------------------------
// explainField
// ---------------------------------------------------------------------------

describe("explainField", () => {
  const raw = readMarcFile("loc.mrc");
  const records = splitRecords(raw);

  it("adds a label to a field based on MARC21 definitions", async () => {
    const record = parseRecord(records[0]);
    const titleField = record.fields.find((f: Field) => f.code === "245");

    expect(titleField).toBeDefined();
    if (!titleField) return;

    const explained = await explainField(titleField, "marc21");

    expect(explained.label).toBeDefined();
    expect(typeof explained.label).toBe("string");
    expect((explained.label as string).length).toBeGreaterThan(0);
  });

  it("adds indicators_label when the field has indicators", async () => {
    const record = parseRecord(records[0]);
    const fieldWithIndicators = record.fields.find(
      (f: Field) => f.code === "245" && f.indicator !== undefined && f.subfields !== undefined,
    );

    expect(fieldWithIndicators).toBeDefined();
    if (!fieldWithIndicators) return;

    const explained = await explainField(fieldWithIndicators, "marc21");

    expect(explained.indicators_label).toBeDefined();
    expect(Array.isArray(explained.indicators_label)).toBe(true);
    expect(explained.indicators_label!.length).toBeGreaterThan(0);
  });

  it("adds labels to subfields", async () => {
    const record = parseRecord(records[0]);
    const fieldWithSubfields = record.fields.find(
      (f: Field) => f.code === "245" && f.subfields !== undefined && f.subfields.length > 0,
    );

    expect(fieldWithSubfields).toBeDefined();
    if (!fieldWithSubfields) return;

    const explained = await explainField(fieldWithSubfields, "marc21");

    expect(explained.subfields).toBeDefined();
    if (explained.subfields) {
      for (const sf of explained.subfields) {
        expect(sf).toHaveProperty("label");
      }
    }
  });

  it("returns the field unchanged when format does not exist", async () => {
    const record = parseRecord(records[0]);
    const field = record.fields[0];

    const result = await explainField(field, "nonexistent");

    // Should return the field without adding labels
    expect(result.code).toBe(field.code);
    expect(result.label).toBeUndefined();
  });

  it("returns the field unchanged when field code is not in the format", async () => {
    const record = parseRecord(records[0]);
    // Use a real field but explain it with the wrong format where the code might not exist
    const field = record.fields[0];

    const result = await explainField(field, "unimarc");

    // Should still return the field with the same code
    expect(result.code).toBe(field.code);
  });
});

// ---------------------------------------------------------------------------
// explainRecord with MARC21
// ---------------------------------------------------------------------------

describe("explainRecord with MARC21", () => {
  const raw = readMarcFile("loc.mrc");
  const records = splitRecords(raw);

  it("enriches all fields with labels from MARC21 definitions", async () => {
    const record = parseRecord(records[0]);
    const explained = await explainRecord(record, "marc21");

    expect(explained.fields.length).toBe(record.fields.length);

    // All fields that exist in the MARC21 format should have labels
    const fieldsWithLabels = explained.fields.filter(
      (f) => f.label !== undefined,
    );
    expect(fieldsWithLabels.length).toBeGreaterThan(0);
  });

  it("preserves all original record properties", async () => {
    const record = parseRecord(records[0]);
    const explained = await explainRecord(record, "marc21");

    expect(explained.leader).toBe(record.leader);
    expect(explained.rawRecord).toBe(record.rawRecord);
    expect(explained.directory.length).toBe(record.directory.length);
  });

  it("enriches multiple records consistently", async () => {
    const sample = records.slice(0, Math.min(3, records.length));

    for (const recStr of sample) {
      const record = parseRecord(recStr);
      const explained = await explainRecord(record, "marc21");

      expect(explained.fields.length).toBe(record.fields.length);
      expect(explained.leader).toBe(record.leader);
    }
  });
});

// ---------------------------------------------------------------------------
// explainRecord with UNIMARC
// ---------------------------------------------------------------------------

describe("explainRecord with UNIMARC", () => {
  const raw = readMarcFile("openedition_unimarc.iso2709");
  const records = splitRecords(raw);

  it("enriches fields with UNIMARC labels", async () => {
    const record = parseRecord(records[0]);
    const explained = await explainRecord(record, "unimarc");

    expect(explained.fields.length).toBe(record.fields.length);

    // UNIMARC fields should get labels
    const fieldsWithLabels = explained.fields.filter(
      (f) => f.label !== undefined,
    );
    expect(fieldsWithLabels.length).toBeGreaterThan(0);
  });

  it("preserves parsed structure after enrichment", async () => {
    const record = parseRecord(records[0]);
    const explained = await explainRecord(record, "unimarc");

    expect(explained.leader).toBe(record.leader);
    expect(explained.header).toBe(record.header);
    expect(explained.directory.length).toBe(record.directory.length);
  });
});

// ---------------------------------------------------------------------------
// formats export
// ---------------------------------------------------------------------------

describe("formats export", () => {
  it("resolves to an object with 'marc21' and 'unimarc' keys", async () => {
    const loadedFormats = await formats;

    expect(typeof loadedFormats).toBe("object");
    expect(loadedFormats).toHaveProperty("marc21");
    expect(loadedFormats).toHaveProperty("unimarc");
  });

  it("marc21 format contains field definitions", async () => {
    const loadedFormats = await formats;

    expect(typeof loadedFormats.marc21).toBe("object");
    const keys = Object.keys(loadedFormats.marc21);
    expect(keys.length).toBeGreaterThan(0);

    // Spot-check a well-known field
    const field100 = loadedFormats.marc21["100"];
    expect(field100).toBeDefined();
    expect(typeof field100.value).toBe("string");
    expect(field100.value!.length).toBeGreaterThan(0);
  });

  it("unimarc format contains field definitions", async () => {
    const loadedFormats = await formats;

    expect(typeof loadedFormats.unimarc).toBe("object");
    const keys = Object.keys(loadedFormats.unimarc);
    expect(keys.length).toBeGreaterThan(0);
  });
});
