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

const getJson: (file: string) => JsonPrimitive | Promise<JsonPrimitive> = (() => {
  try {
    // Node.js context: require is available via tsx/vitest runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeRequire = (globalThis as Record<string, unknown>).require as
      | ((id: string) => typeof import("node:fs"))
      | undefined;
    if (nodeRequire) {
      const { readFileSync } = nodeRequire("fs");
      return (file: string): JsonPrimitive =>
        JSON.parse(readFileSync(file, "utf8")) as JsonPrimitive;
    }
    throw new Error("require not available");
  } catch {
    // Browser fallback
    return async (file: string): Promise<JsonPrimitive> =>
      (await (await fetch(file)).json()) as JsonPrimitive;
  }
})();

// ---------------------------------------------------------------------------
// Format definitions – self-resolving Promise
// ---------------------------------------------------------------------------

let formats: Promise<FormatMap> = ((formDefs: string) => {
  return new Promise<FormatMap>(async (resolve) => {
    let prefix = "../";
    let defs: Record<string, string>;

    try {
      defs = (await getJson(prefix + formDefs)) as unknown as Record<string, string>;
    } catch {
      prefix = "";
      defs = (await getJson(prefix + formDefs)) as unknown as Record<string, string>;
    }

    const result: Record<string, Record<string, FieldDefinition>> = {};
    await Promise.all(
      Object.keys(defs).map(async (key) => {
        result[key] = (await getJson(
          prefix + defs[key],
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
