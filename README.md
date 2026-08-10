# JsMarc

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](https://github.com/corbin-c/jsmarc)

> A zero-dependency Vanilla JavaScript library for parsing, filtering, extracting, and explaining bibliographic [MARC](https://en.wikipedia.org/wiki/MARC_standards) (MAchine Readable Cataloging) records. Works in browsers and Node.js with no build step.

JsMarc was created by [Clément Corbin](https://github.com/corbin-c) to make MARC data accessible from the web and the terminal.

---

## Features

- **Parse MARC records** — Convert raw ISO 2709 MARC data into structured JavaScript objects, handling leader, directory, fields, and subfields.
- **Filter records** — Extract matching records from a batch by field/subfield values (e.g. filter by ISBN).
- **Extract data** — Pull specific fields from large record sets, with JSON output.
- **Explain fields** — Annotate parsed records with human-readable labels using standard MARC definition files (MARC21, UNIMARC).
- **Search fields** — Reverse-lookup field codes by keyword (e.g. search "author" to find all related fields).
- **Works everywhere** — Browser (ES modules), Node.js (via a light bridge), and a command-line tool.
- **Batch processing** — Parse entire `.mrc` files or piped records, not just single entries.

## Installation

JsMarc is not published on npm. It is designed to be used directly from the source.

```bash
git clone https://github.com/corbin-c/jsmarc.git
```

**No `npm install`, no build step, no bundler required.**

### Browser

Import modules directly from the source or a hosted URL. No installation needed.

```js
import * as MarcParser from "https://corbin-c.github.io/jsmarc/src/parser.js";
import * as MarcHelper from "https://corbin-c.github.io/jsmarc/src/helper.js";
```

### Node.js

Use the `marc-node` executable directly (requires Node.js ≥ 12).

```bash
# Optionally symlink it to your PATH
ln -s /path/to/jsmarc/marc-node /usr/local/bin/marc-node
```

The Node.js bridge (`src/ESrequire.js`) adapts ES module exports to CommonJS `require()` so the same modules run in both environments.

## Quick Start

### Browser

```js
import { parseRecord } from "https://corbin-c.github.io/jsmarc/src/parser.js";
import { explainRecord } from "https://corbin-c.github.io/jsmarc/src/helper.js";

const record = parseRecord(rawMarcString);
const explained = await explainRecord(record, "marc21");

console.log(explained);

```

### Node.js

```js
const MarcParser = require("./src/ESrequire.js")("./src/parser.js");
const MarcHelper = require("./src/ESrequire.js")("./src/helper.js");

const record = MarcParser.parseRecord(rawMarcString);
const explained = await MarcHelper.explainRecord(record, "marc21");

console.log(explained);
```

### CLI (one-liner)

```bash
# Fetch records and display with field explanations
curl "https://web-z3950-master.onrender.com/?server=lx2.loc.gov:210/LCDB&isbn=0066620724&format=usmarc" | ./marc-node display - --format=marc21
```

## CLI Usage

```
marc-node COMMAND FILE [OPTIONS]
```

If `FILE` is `-`, the tool reads from stdin.

### Commands

| Command | Description |
|---------|-------------|
| `display` | Parse and display records (with optional field explanation via `--format`) |
| `filter`  | Filter records by field/subfield values |
| `extract` | Extract specific fields as JSON |
| `help`    | Show usage information |

### Options

| Option | Syntax | Default | Description |
|--------|--------|---------|-------------|
| `--encoding` | string | `utf8` | File encoding when reading from disk |
| `--record-separator` | string | `\u001d` | Character that separates records in the batch |
| `--field-separator` | string | `\u001e` | Field separator within a record |
| `--subfield-separator` | string | `\u001f` | Subfield separator within a field |
| `--format` | `marc21` or `unimarc` | — | Enrich display with field/subfield labels from definitions |
| `--fields` | notation string | `*` | Field notation (e.g. `020$a,856$u`) — use `\` to escape `$` in shells |
| `--values` | comma-separated | — | Values for filtering (quote values containing spaces) |

### Examples

**Display all records with explained fields:**

```bash
curl "https://web-z3950-master.onrender.com/?server=lx2.loc.gov:210/LCDB&isbn=0066620724,0596001312&format=usmarc" | ./marc-node display - --format=marc21
```

**Limit display to specific fields:**

```bash
./marc-node display /path/to/records.mrc --fields=856\$u
```

**Extract fields as JSON:**

```bash
./marc-node extract /path/to/records.mrc --fields=100\$a,020\$a
```

Output:

```json
[{
  "leader": "01208cam a22003014a 4500",
  "fields": [
    { "code": "020", "indicator": "  ", "subfields": [{ "code": "a", "value": "0066620724 (hc)" }] },
    { "code": "100", "indicator": "1 ", "subfields": [{ "code": "a", "value": "Torvalds, Linus," }] }
  ]
}]
```

**Filter records by value:**

```bash
./marc-node filter ./records.mrc --fields=020\$a --values=0596001312,"0066620724 (hc)"
```

Only records whose `020$a` matches one of the given comma-separated values are kept. Output is raw MARC.

**Pipe from stdin:**

```bash
cat /path/to/records.mrc | ./marc-node display - --fields=245\$a
```

## API Reference

All exports from the parser and helper modules.

### `src/parser.js`

#### `parseRecord(recordString, options?)`

Parse a raw MARC record string into a structured `MarcParser` object.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `recordString` | `string` | *required* | Raw ISO 2709 MARC record |
| `options.toParse` | `string \| string[]` | `"*"` | Field notation(s) to parse (e.g. `"020\$a,856\$u"` or `["020\$a"]`). `"*"` parses all fields. |
| `options.fields` | `string` | `"\u001e"` | Custom field separator |
| `options.subfields` | `string` | `"\u001f"` | Custom subfield separator |

**Returns:** `MarcParser` — an object with the following shape:

```js
{
  rawRecord: string,        // the original record string
  leader: string,           // first 24 characters
  header: string,           // leader + directory + field separator
  fieldSeparator: string,   // field separator used
  subfieldSeparator: string,// subfield separator used
  parseCode: string,        // field notation filter applied
  directory: [{             // parsed directory entries
    code: string,           // field tag (e.g. "001")
    length: string,         // field length (zero-padded)
    position: string        // byte offset from start of body (zero-padded)
  }],
  fields: [{               // parsed fields
    code: string,           // field tag
    value?: string,         // raw value (control fields: 001-009)
    indicator?: string,     // two indicator characters (data fields: 010+)
    subfields?: [{          // parsed subfields (data fields only)
      code: string,         // subfield code (single character)
      value: string         // subfield data
    }]
  }]
}
```

#### `filterRecord(parsedRecord, fieldNotation, values)`

Check if a parsed record contains matching values for a given field.

| Parameter | Type | Description |
|-----------|------|-------------|
| `parsedRecord` | `MarcParser` | A record returned by `parseRecord()` |
| `fieldNotation` | `string` | Field notation (e.g. `"020\$a"`) |
| `values` | `string[]` | Values to match against |

**Returns:** `boolean` — `true` if the record matches at least one value.

#### `analyzeFieldNotation(notationString)`

Parse a field notation string into a predicate function used internally by the parser.

| Parameter | Type | Description |
|-----------|------|-------------|
| `notationString` | `string` | Comma-separated field notations (e.g. `"020\$a,856\$u"`) or `"*"` |

**Returns:** `Function` — a filter function `(recordPart) => boolean` that tests if a record part matches.

#### `bin`

Binary-safe string utility for byte-level length and slicing (handles multi-byte characters correctly in both browser and Node.js contexts).

```js
bin.length(str)       // → number (byte length)
bin.slice(str, start, end)  // → string (byte-level slice)
```

#### `MARC`

Default configuration template with ISO 2709 separators:

```js
MARC.recordSeparator   // "\u001d"
MARC.fieldSeparator    // "\u001e"
MARC.subfieldSeparator // "\u001f"
```

#### `MarcParser`

The parser class. Always prefer the `parseRecord()` wrapper unless you need the class directly.

### `src/helper.js`

#### `explainRecord(parsedRecord, format)`

Enrich a parsed record with human-readable labels from MARC definition files.

| Parameter | Type | Description |
|-----------|------|-------------|
| `parsedRecord` | `MarcParser` | A record returned by `parseRecord()` |
| `format` | `string` | Format key from `formats.json` (e.g. `"marc21"`, `"unimarc"`) |

**Returns:** `Promise<object>` — the record with added `label` properties on fields, subfields, and indicators.

#### `explainField(field, format)`

Same as `explainRecord` but operates on a single field object.

**Returns:** `Promise<object>` — the field object with added labels.

#### `searchField(searchString, format)`

Search for field/subfield codes by keyword in the definition files.

| Parameter | Type | Description |
|-----------|------|-------------|
| `searchString` | `string` | Keyword to search (e.g. `"author"`, `"auteur"`) |
| `format` | `string` | Format key (e.g. `"marc21"`, `"unimarc"`) |

**Returns:** `Promise<Array<{code: string, value: string}>>` — matching code/label pairs.

```js
await searchField("auteur", "unimarc");
// [
//   { code: "200\$c", value: "Titre propre d'un auteur différent" },
//   { code: "701\$4", value: "Auteur d'oeuvre adaptée ou continuée" },
//   ...
// ]
```

#### `formats`

A Promise that resolves to the loaded format definitions registry (from `formats.json`). Used internally — you typically access definitions through `explainRecord` or `searchField`.

## Project Structure

```
jsmarc/
├── app/                    # Web application
│   ├── index.html
│   ├── front.js
│   └── style.css
├── definitions/            # MARC format definitions
│   ├── marc21.json
│   └── unimarc.json
├── samples/                # Sample MARC record files
├── src/                    # Core source modules
│   ├── parser.js           # Main MARC record parser
│   ├── helper.js           # Field explanation & search via definitions
│   ├── CLI.js              # Terminal display utilities
│   └── ESrequire.js        # Node.js ES module → CommonJS bridge
├── marc-node               # Node.js CLI executable
├── formats.json            # Registry mapping format names to definition files
├── test.js                 # Node.js test suite
├── test.html               # Browser test page
├── rec.mrc                 # Sample record file
└── LICENSE                 # GNU GPL v3
```

## Supported Formats

JsMarc ships with definition files for two MARC variants:

| Format | Source | License | Language |
|--------|--------|---------|----------|
| **MARC21** | Library of Congress | Public domain | English |
| **UNIMARC** | ABES (Agence Bibliographique de l'Enseignement Supérieur) | CC BY-SA | French |

Definitions provide human-readable labels for every field, subfield, and indicator value. These labels power the `explainRecord` and `searchField` APIs as well as the CLI's `--format` flag.

### Format Definitions

The `formats.json` file maps format names to their definition files:

```json
{
  "marc21": "definitions/marc21.json",
  "unimarc": "definitions/unimarc.json"
}
```

#### Adding a custom format

1. Create a JSON file in `definitions/` following the existing schema (see `definitions/marc21.json` for reference):
   ```json
   {
     "010": {
       "value": "Library of Congress Control Number",
       "ind1": { "#": "Undefined" },
       "ind2": { "#": "Undefined" },
       "subfields": {
         "a": { "*": "LC control number" }
       }
     }
   }
   ```
2. Add an entry to `formats.json`:
   ```json
   {
     "myformat": "definitions/myformat.json"
   }
   ```
3. Use it immediately:
   ```bash
   ./marc-node display records.mrc --format=myformat
   ```

### Web App

A full-featured web interface is hosted at **[corbin-c.github.io/jsmarc/app/](https://corbin-c.github.io/jsmarc/app/)**. It supports batch record parsing, filtering, data extraction (HTML table or JSON), and field explanation on hover. The app uses [Workerify](https://github.com/corbin-c/workerify) to run JsMarc in Web Workers for non-blocking processing of large batches.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes — keep it Vanilla JS, no dependencies
4. Run the test suites (`node test.js`, open `test.html` in a browser)
5. Submit a pull request

For major changes, consider opening an issue first to discuss your approach.

## License

JsMarc is released under the [GNU General Public License v3.0](LICENSE). You are free to use, modify, and distribute it under those terms.

## Acknowledgments

- **[Library of Congress](https://www.loc.gov/marc/)** for the MARC21 standard and public-domain field definitions
- **[ABES](https://www.abes.fr/)** for the UNIMARC field definitions (CC BY-SA)
- The MARC standards community for decades of cataloging infrastructure
- **[Workerify](https://github.com/corbin-c/workerify)** for powering the web app's off-thread processing
- **[Web-Z3950](https://github.com/corbin-c/web-z3950)** by the same author, used in CLI examples for fetching live records
