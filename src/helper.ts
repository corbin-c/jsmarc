import type { Field, MarcRecord } from "./parser.js";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FieldDefinition {
  value?: string;
  ind1?: Record<string, string>;
  ind2?: Record<string, string>;
  subfields?: Record<string, Record<string, string>>;
}

export interface FormatMap {
  [formatName: string]: Record<string, FieldDefinition>;
}

export interface SearchResult {
  code: string;
  value: string;
}

export interface ExplainedField extends Field {
  label?: string;
  indicators_label?: string[];
}

export interface ExplainedRecord extends Omit<MarcRecord, "fields"> {
  fields: ExplainedField[];
}

// ---------------------------------------------------------------------------
// JSON loading – context-aware (Node vs browser)
// ---------------------------------------------------------------------------

const DEFINITIONS = "formats.json";

type JsonPrimitive = Record<string, unknown>;

const getJson: (file: string) => Promise<JsonPrimitive> = (() => {
  // Lazy-loaded Node.js modules (only in Node.js runtime)
  let nodeLoad: Promise<{ readFileSync: (p: string, enc: string) => string; resolve: (f: string) => string }> | null = null;

  const loadNode = (): Promise<{ readFileSync: (p: string, enc: string) => string; resolve: (f: string) => string }> => {
    if (!nodeLoad) {
      nodeLoad = (async () => {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const url = await import("node:url");
        const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
        const projectRoot = path.resolve(__dirname, "..");
        return {
          readFileSync: fs.readFileSync as (p: string, enc: string) => string,
          resolve: (file: string) => path.resolve(projectRoot, file),
        };
      })();
    }
    return nodeLoad;
  };

  return async (file: string): Promise<JsonPrimitive> => {
    if (typeof process !== "undefined" && process.versions?.node) {
      const node = await loadNode();
      return JSON.parse(node.readFileSync(node.resolve(file), "utf8")) as JsonPrimitive;
    }
    // Browser fallback
    return (await (await fetch(file)).json()) as JsonPrimitive;
  };
})();

// ---------------------------------------------------------------------------
// Format definitions – self-resolving Promise
// ---------------------------------------------------------------------------

let formats: Promise<FormatMap> = ((formDefs: string) => {
  return new Promise<FormatMap>(async (resolve) => {
    const defs = (await getJson(formDefs)) as unknown as Record<string, string>;

    const result: Record<string, Record<string, FieldDefinition>> = {};
    await Promise.all(
      Object.keys(defs).map(async (key) => {
        result[key] = (await getJson(
          defs[key],
        )) as unknown as Record<string, FieldDefinition>;
      }),
    );

    resolve(result);
  });
})(DEFINITIONS);

// Self-resolve the formats promise to cache the result
(async () => {
  formats = Promise.resolve(await formats);
})();

// ---------------------------------------------------------------------------
// searchField
// ---------------------------------------------------------------------------

export const searchField = async (
  str: string,
  format: string,
): Promise<SearchResult[]> => {
  const formatDefs = await formats;

  if (formatDefs[format] === undefined) {
    throw new Error(`No such format \`${format}\``);
  }

  const formatData = formatDefs[format];
  const results: SearchResult[] = [];

  const contains = (haystack: string, needle: string): boolean =>
    haystack.toLowerCase().includes(needle.toLowerCase());

  for (const code of Object.keys(formatData)) {
    const fieldDef = formatData[code];

    if (fieldDef.value !== undefined && contains(fieldDef.value, str)) {
      results.push({ code, value: fieldDef.value });
    }

    if (fieldDef.subfields !== undefined) {
      for (const sfCode of Object.keys(fieldDef.subfields)) {
        const sfData = fieldDef.subfields[sfCode];
        for (const sfKey of Object.keys(sfData)) {
          if (contains(sfData[sfKey], str)) {
            const combinedCode = `${code}$${sfCode}`;
            if (!results.some((r) => r.code === combinedCode)) {
              results.push({ code: combinedCode, value: sfData[sfKey] });
            }
          }
        }
      }
    }
  }

  return results;
};

// ---------------------------------------------------------------------------
// explainField
// ---------------------------------------------------------------------------

export const explainField = async (
  field: Field,
  format: string,
): Promise<ExplainedField> => {
  const formatDefs = await formats;
  const explained: ExplainedField = { ...field };

  const formatData = formatDefs[format];
  if (formatData === undefined) {
    return explained;
  }

  const fieldDef = formatData[field.code];
  if (fieldDef === undefined) {
    return explained;
  }

  explained.label = fieldDef.value;

  if (field.indicator !== undefined) {
    const indicatorsLabel: string[] = [];
    for (const [i, indChar] of field.indicator.split("").entries()) {
      try {
        const target = indChar === " " ? "#" : indChar;
        const indKey = `ind${i + 1}` as "ind1" | "ind2";
        const label = fieldDef[indKey]?.[target];
        if (label !== undefined) {
          indicatorsLabel.push(label);
        }
      } catch {
        console.warn("indicator not found");
      }
    }
    if (indicatorsLabel.length > 0) {
      explained.indicators_label = indicatorsLabel;
    }
  }

  if (field.subfields !== undefined) {
    explained.subfields = field.subfields.map((subfield) => {
      let subfieldLabel = "";
      const sfDef = fieldDef.subfields?.[subfield.code];

      if (sfDef !== undefined) {
        const defKeys = Object.keys(sfDef);
        if (defKeys.length > 0 && defKeys[0] === "*") {
          subfieldLabel = sfDef["*"];
        }
        if (sfDef[subfield.value] !== undefined) {
          subfieldLabel = sfDef[subfield.value];
        }
      }

      return { ...subfield, label: subfieldLabel };
    });
  }

  return explained;
};

// ---------------------------------------------------------------------------
// explainRecord
// ---------------------------------------------------------------------------

export const explainRecord = async (
  record: MarcRecord,
  format: string,
): Promise<ExplainedRecord> => {
  const explainedFields = await Promise.all(
    record.fields.map((field) => explainField(field, format)),
  );

  return { ...record, fields: explainedFields };
};

export { formats };
