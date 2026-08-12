export interface DirectoryEntry {
  code: string;
  length: string;
  position: string;
}

export interface Subfield {
  code: string;
  value: string;
}

export interface Field {
  code: string;
  value?: string;
  indicator?: string;
  subfields?: Subfield[];
}

export interface MarcRecord {
  rawRecord: string;
  leader: string;
  header: string;
  fieldSeparator: string;
  subfieldSeparator: string;
  parseCode: string;
  directory: DirectoryEntry[];
  fields: Field[];
}

export interface ParseOptions {
  toParse?: string;
  fields?: string;
  subfields?: string;
}

export interface FieldNotationPart {
  field: string;
  subfield: string | false;
}

type AnalyzeFilter = (this: { parentCode?: string }, recordPart: { code: string }) => boolean;

// Internal keys used by MarcParser template
interface MarcTemplate {
  recordSeparator: string;
  fieldSeparator: string;
  subfieldSeparator: string;
  rawRecord: string;
  leader: string;
  directory: DirectoryEntry[];
  fields: Field[];
  "@fields": {
    code: string;
    indicator: string;
    subfields: Subfield[];
    value: string;
  };
  "@directory": {
    code: [number, number];
    length: [number, number];
    position: [number, number];
  };
}

const bin = {
  // slice and length functions adapted to work on byte count, not char count
  length(str: string): number {
    try {
      return new Blob([str]).size; // browser context
    } catch {
      return Buffer.from(str).length; // node
    }
  },

  slice(str: string, start: number, end?: number): string {
    // Build byte-to-char offset map (computed once per slice call)
    let bytePos = 0;
    const byteToChar: number[] = new Array(str.length + 1);
    for (let i = 0; i <= str.length; i++) {
      byteToChar[bytePos] = i;
      if (i < str.length) {
        const code = str.charCodeAt(i);
        bytePos +=
          code >= 0xd800 && code <= 0xdbff
            ? 4 // high surrogate pair (2 UTF-16 code units = 4 bytes in UTF-8)
            : code <= 0x7f
              ? 1
              : code <= 0x7ff
                ? 2
                : 3; // code > 0x7FF and not surrogate
      }
    }
    byteToChar[bytePos] = str.length; // sentinel for end-of-string

    const charStart = byteToChar[start];
    if (typeof end === "undefined") {
      return str.slice(charStart);
    }
    const charEnd = byteToChar[end];
    return str.slice(charStart, charEnd);
  },
};

function analyzeFieldNotation(str: string): AnalyzeFilter {
  if (str === "*") {
    return () => true;
  }

  const parts: FieldNotationPart[] = str.split(",").map((f) => {
    const split = f.split("$");
    while (split[0].length < 3) {
      split[0] = "0" + split[0];
    }
    return { field: split[0], subfield: split[1] || false };
  });

  return function (this: { parentCode?: string }, recordPart: { code: string }): boolean {
    if (recordPart.code.length === 3) {
      return parts.map((e) => e.field).some((code) => code === recordPart.code);
    }
    if (this?.parentCode !== undefined) {
      return parts
        .filter((e) => e.field === this.parentCode)
        .map((e) => e.subfield)
        .some((code) => (code === false ? true : code === recordPart.code));
    }
    return true;
  };
}

const MARC: MarcTemplate = {
  // Template object
  recordSeparator: "\u001d",
  fieldSeparator: "\u001e",
  subfieldSeparator: "\u001f",
  rawRecord: "",
  leader: "",
  directory: [],
  fields: [],
  "@fields": {
    code: "",
    indicator: "  ",
    subfields: [],
    value: "",
  },
  "@directory": {
    code: [0, 3],
    length: [3, 7],
    position: [7, 12],
  },
};

class MarcParser implements MarcRecord {
  rawRecord!: string;
  leader!: string;
  header!: string;
  fieldSeparator!: string;
  subfieldSeparator!: string;
  parseCode!: string;
  directory!: DirectoryEntry[];
  fields!: Field[];
  recordSeparator!: string;
  "@fields": MarcTemplate["@fields"];
  "@directory": MarcTemplate["@directory"];

  constructor(rec: string, params: ParseOptions = {}) {
    Object.assign(this, JSON.parse(JSON.stringify(MARC))); // locally copy template
    // populate object
    this.rawRecord = rec;
    this.fieldSeparator = params.fields || this.fieldSeparator;
    this.subfieldSeparator = params.subfields || this.subfieldSeparator;
    this.parseCode = params.toParse || "*";
  }

  parse(): this {
    try {
      this.parseHeader();
      this.parseBody(this.body());
    } catch (e) {
      console.error(e, this);
    }
    return this;
  }

  private parseHeader(): void {
    const rawDirectory = this.rawRecord.split(this.fieldSeparator)[0].slice(24); // 25th char to first separator
    this.leader = this.rawRecord.slice(0, 24); // 24 chars of the record
    this.header = this.leader + rawDirectory + this.fieldSeparator;
    this.directory = this.parseDirectory(rawDirectory);
  }

  private parseDirectory(rawDir: string): DirectoryEntry[] {
    return [...new Array(rawDir.length / 12).fill(0)].map((_e, i) => {
      const segment = rawDir.slice(i * 12, (i + 1) * 12);
      const entry: DirectoryEntry = {} as DirectoryEntry;
      Object.keys(this["@directory"]).forEach((k) => {
        (entry as unknown as Record<string, string>)[k] = segment.slice(
          ...(this["@directory"] as Record<string, [number, number]>)[k],
        );
      });
      return entry;
    });
  }

  private parseBody(rawBody: string): void {
    this.directory
      .filter(analyzeFieldNotation(this.parseCode))
      .forEach((e) => {
        this.fields.push(
          this.parseField({
            code: e.code,
            value: bin.slice(
              rawBody,
              parseInt(e.position),
              parseInt(e.length) + parseInt(e.position),
            ),
          }),
        );
      });
    this.fields = this.fields.filter(
      (e) => typeof e.value !== "undefined" || e.subfields!.length > 0,
    );
  }

  private parseField(field: Field): Field {
    field.value = field.value!.split(this.fieldSeparator)[0];
    if (field.value.indexOf(this.subfieldSeparator) >= 0) {
      field.indicator = field.value.slice(0, 2);
      field.subfields = field.value
        .slice(2)
        .split(this.subfieldSeparator)
        .slice(1)
        .map((e: string) => {
          const subfield: Subfield = { code: "", value: "" };
          subfield.code = e.slice(0, 1);
          subfield.value = e.slice(1);
          return subfield;
        });
      field.subfields = field.subfields.filter(analyzeFieldNotation(this.parseCode), {
        parentCode: field.code,
      });
      delete field.value;
    }
    return field;
  }

  private body(): string {
    return bin.slice(this.rawRecord, bin.length(this.header));
  }
}

function parseRecord(record: string, parameters?: ParseOptions): MarcParser {
  return new MarcParser(record, parameters).parse();
}

function filterRecord(
  record: MarcRecord,
  field: string | AnalyzeFilter,
  values: string[],
): boolean {
  const filterFn = typeof field === "string" ? analyzeFieldNotation(field) : field;
  let result: Field | undefined = record.fields.find(filterFn);
  if (typeof result !== "undefined") {
    result = result.subfields!.find(filterFn, { parentCode: result.code });
  }
  return typeof result !== "undefined"
    ? values.some((value) => value === result!.value)
    : false;
}

export { bin, MARC, MarcParser, parseRecord, filterRecord, analyzeFieldNotation };
