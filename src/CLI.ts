import type { MarcRecord, Subfield } from "./parser.js";

interface ExtendedSubfield extends Subfield {
  label?: string;
}

interface ExtendedField {
  code: string;
  value?: string;
  indicator?: string;
  subfields?: ExtendedSubfield[];
  label?: string;
  indicators_label?: string[];
}

interface DisplayRecord extends MarcRecord {
  label?: string;
  indicators_label?: string[];
  fields: ExtendedField[];
}

export function invert(str: string): string {
  return "\u001b[30m\u001b[107m" + str + "\u001b[0m";
}

function divide(str: string, limit: number): string[] {
  const out: string[] = [];
  let line = "";
  const words = str.split(" ");
  words.forEach((e, i) => {
    if (line.length + e.length + 1 < limit) {
      line += " " + e;
    } else {
      out.push(line);
      line = e;
    }
    if (i === words.length - 1 && out[out.length - 1] !== line) {
      out.push(line);
    }
  });
  return out;
}

export function show(field: string, value: string): void {
  const width = field.length + 8;
  const lines = divide(value, (process.stdout.columns ?? 80) - width);
  lines.forEach((line, i) => {
    if (i === 0) {
      console.log("    " + invert(field) + "\t" + line);
    } else {
      console.log(
        "\t" +
          invert(
            field
              .replace(/./g, " ")
              .slice(0, -1),
          ) +
          "\t " +
          line,
      );
    }
  });
}

export async function displayRecord(
  record: DisplayRecord,
  help: string | boolean = false,
): Promise<void> {
  show("Leader", record.leader);
  record.fields.forEach((e) => {
    if (typeof e.value !== "undefined") {
      if (help) {
        show((e.label || "").split("\n")[0], " ");
      }
      show(e.code, "\t " + (e.value ?? ""));
    } else {
      show(
        "    " + e.code + "   ",
        help ? invert((e.label || "").split("\n")[0]) : " ",
      );
      show(
        "indicators",
        (e.indicator ?? "").replace(/ /g, "_") +
          (help
            ? "\t" +
              invert(
                (e.indicators_label || [])
                  .filter((l: string | undefined): l is string => typeof l !== "undefined")
                  .join(" | "),
              )
            : ""),
      );
      (e.subfields || []).forEach((s) => {
        if (help) {
          show("\t        " + (s.label || "").split("\n")[0], " ");
        }
        show("\t" + e.code + "$" + s.code + " ", s.value);
      });
    }
  });
}
