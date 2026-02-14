#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import {
  parseRecord,
  filterRecord,
  MARC,
  type ParseOptions,
  type MarcRecord,
} from "./src/parser.js";
import { explainRecord } from "./src/helper.js";
import { invert, displayRecord } from "./src/CLI.js";

// ---------------------------------------------------------------------------
// CLI argument structure
// ---------------------------------------------------------------------------

interface ArgsStructure {
  process: string[];
  mandatory: {
    command: string[];
    file: string[];
  };
  optional: string[];
}

const ARGS_STRUCTURE: ArgsStructure = {
  process: process.argv[1].split("/").slice(-1),
  mandatory: {
    command: ["display", "filter", "extract", "help"],
    file: [],
  },
  optional: [
    "encoding",
    "record-separator",
    "field-separator",
    "subfield-separator",
    "format",
    "fields",
    "values",
  ],
};

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function checkArgs(args: Record<string, string>): void {
  for (const key of Object.keys(ARGS_STRUCTURE.mandatory)) {
    if (typeof args[key] === "undefined") {
      throw new Error("Mandatory argument: " + key);
    } else {
      const allowed = ARGS_STRUCTURE.mandatory[key as keyof typeof ARGS_STRUCTURE.mandatory];
      if (allowed.length > 0 && !allowed.some((v) => v === args[key])) {
        throw new Error(
          "Mandatory argument " +
            key +
            " takes one of values: " +
            allowed.join(", "),
        );
      }
    }
  }
  for (const key of Object.keys(args)) {
    if (
      !Object.keys(ARGS_STRUCTURE.mandatory).some((v) => v === key) &&
      !ARGS_STRUCTURE.optional.some((v) => v === key)
    ) {
      console.log(invert("WARNING:") + '\tUnknown argument "' + key + '"\n');
    }
  }
}

const ARGS: Record<string, string> = (() => {
  const args: Record<string, string> = {};
  process.argv.slice(2).forEach((e, i) => {
    let pair: [string, string];
    if (i === 0) {
      pair = ["command", e];
    } else if (i === 1) {
      pair = ["file", e];
    } else if (e.startsWith("--")) {
      const parts = e.slice(2).split("=");
      pair = [parts[0], parts[1] ?? "true"];
    } else {
      pair = [e, "true"];
    }
    args[pair[0]] = pair[1];
  });
  return args;
})();

// ---------------------------------------------------------------------------
// I/O helpers
// ---------------------------------------------------------------------------

function getFile(path: string): string {
  return readFileSync(path, (ARGS.encoding || "utf8") as BufferEncoding);
}

const rl = createInterface({
  input: process.stdin,
  output: undefined as unknown as NodeJS.WritableStream,
  terminal: false,
});

async function getInput(): Promise<string> {
  try {
    if (ARGS.file !== "-") {
      return getFile(ARGS.file);
    } else {
      return await new Promise<string>((resolve) => {
        rl.on("line", (line: string) => {
          resolve(line);
        });
      });
    }
  } catch {
    commands.help();
    throw new Error("couldn't open input file");
  }
}

function splitRecords(batch: string): string[] {
  return batch
    .split(ARGS["record-separator"] || MARC.recordSeparator)
    .filter((e) => !["", "\n"].includes(e));
}

function getParams(): ParseOptions {
  const params: ParseOptions = {};
  if (ARGS["field-separator"]) {
    params.fields = ARGS["field-separator"];
  }
  if (ARGS["subfield-separator"]) {
    params.subfields = ARGS["subfield-separator"];
  }
  if (ARGS.fields) {
    params.toParse = ARGS.fields;
  }
  return params;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const commands: Record<string, () => Promise<void> | void> = {
  display: async () => {
    let records = await getInput();
    const parameters = getParams();
    const format = ARGS.format || false;
    const recordStrings = splitRecords(records);
    await Promise.all(
      recordStrings.map(async (record) => {
        let parsed: MarcRecord = parseRecord(record, parameters);
        if (format) {
          parsed = await explainRecord(parsed, format as string);
        }
        await displayRecord(parsed, format as string | boolean);
        console.log("");
      }),
    );
    process.exit();
  },

  help: () => {
    const help =
      `Usage: ` +
      ARGS_STRUCTURE.process +
      ` COMMAND FILE [OPTIONS]\n
If FILE is -, read stdin.\n\nCommands:\n\t` +
      ARGS_STRUCTURE.mandatory.command.join("\n\t") +
      `\n\nOptions:\t\tSyntax: --KEY=VALUE
\t` +
      ARGS_STRUCTURE.optional.join("\n\t") +
      `\n`;
    console.log(help);
    process.exit();
  },

  filter: async () => {
    let records = await getInput();
    const parameters = getParams();
    if (typeof parameters.toParse === "undefined") {
      console.log(
        invert(String(new Error("--fields option is required for record extraction"))) +
          "\n",
      );
      commands.help();
      process.exit();
    }
    if (typeof ARGS.values === "undefined") {
      console.log(
        invert(String(new Error("--values option is required for record extraction"))) +
          "\n",
      );
      commands.help();
      process.exit();
    }
    const recordStrings = splitRecords(records);
    const results = await Promise.all(
      recordStrings.map(async (e) => {
        const parsed = parseRecord(e, parameters);
        const keep = filterRecord(
          parsed,
          parameters.toParse!,
          ARGS.values.split(","),
        );
        return keep ? parsed.rawRecord : "";
      }),
    );
    console.log(
      results
        .filter((e) => e !== "")
        .join(ARGS["record-separator"] || MARC.recordSeparator),
    );
    process.exit();
  },

  extract: async () => {
    const output: Array<{ leader: string; fields: MarcRecord["fields"] }> = [];
    let records = await getInput();
    const parameters = getParams();
    if (typeof parameters.toParse === "undefined") {
      console.log(
        invert(
          String(new Error("--fields option is required for data extraction")),
        ) + "\n",
      );
      commands.help();
      process.exit();
    }
    const recordStrings = splitRecords(records);
    await Promise.all(
      recordStrings.map(async (record) => {
        const parsed = parseRecord(record, parameters);
        output.push({ leader: parsed.leader, fields: parsed.fields });
        console.log("");
      }),
    );
    console.log(JSON.stringify(output));
    process.exit();
  },
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

try {
  checkArgs(ARGS);
  commands[ARGS.command]();
} catch (e) {
  console.log(invert(String(e)) + "\n");
  commands.help();
}
