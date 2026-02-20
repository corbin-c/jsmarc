/**
 * Parses MARC sample files and writes JSON representations.
 *
 * Reads MARC binary files from samples/, parses each record using
 * parseRecord(), and writes pretty-printed JSON alongside the originals.
 */
const fs = require("fs");
const path = require("path");

// Load ESrequire adapter (creates global ESrequire function)
require(path.join(__dirname, "..", "src", "ESrequire.js"));

// Parse the parser module using ESrequire
const { parseRecord } = ESrequire(path.join(__dirname, "..", "src", "parser.js"));

const SAMPLES_DIR = path.join(__dirname, "..", "samples");
const RECORD_SEPARATOR = "\u001d";
const SKIP_PATTERNS = [/^README\.md$/i, /\.json$/i];

/**
 * Determines whether a filename should be processed.
 * Early exit: returns false immediately for files matching skip patterns.
 */
function shouldProcess(filename) {
  return !SKIP_PATTERNS.some(function (pattern) {
    return pattern.test(filename);
  });
}

/**
 * Splits raw MARC content into individual record strings.
 * Filters out empty and whitespace-only strings at the boundary.
 */
function splitRecords(rawContent) {
  return rawContent
    .split(RECORD_SEPARATOR)
    .map(function (record) {
      return record.trim();
    })
    .filter(function (record) {
      return record.length > 0;
    });
}

/**
 * Parses a single MARC record string into a structured object.
 * Returns null if parsing fails — caller handles the nil case.
 */
function safeParseRecord(recordStr, fileLabel) {
  try {
    return parseRecord(recordStr);
  } catch (error) {
    console.error("  [ERROR] Failed to parse record in " + fileLabel + ": " + error.message);
    return null;
  }
}

/**
 * Processes a single MARC file: reads, splits, parses, and writes JSON output.
 * Returns the count of successfully parsed records.
 */
function processFile(filePath) {
  var filename = path.basename(filePath);
  var rawContent;
  var recordStrings;
  var parsedRecords = [];
  var outputPath;
  var i;
  var recordStr;
  var parsed;

  // Read the file with latin1 encoding to preserve binary separators
  try {
    rawContent = fs.readFileSync(filePath, "latin1");
  } catch (error) {
    console.error("[ERROR] Cannot read " + filename + ": " + error.message);
    return 0;
  }

  if (rawContent.length === 0) {
    console.warn("[WARN] Empty file: " + filename);
    return 0;
  }

  // Split into individual record strings
  recordStrings = splitRecords(rawContent);

  if (recordStrings.length === 0) {
    console.warn("[WARN] No records found in " + filename);
    return 0;
  }

  // Parse each record, collecting non-null results
  for (i = 0; i < recordStrings.length; i++) {
    recordStr = recordStrings[i];
    parsed = safeParseRecord(recordStr, filename);
    if (parsed !== null) {
      parsedRecords.push(parsed);
    }
  }

  if (parsedRecords.length === 0) {
    console.warn("[WARN] No records successfully parsed from " + filename);
    return 0;
  }

  // Write JSON output alongside the original file
  outputPath = filePath + ".json";
  try {
    fs.writeFileSync(outputPath, JSON.stringify(parsedRecords, null, 2), "utf8");
  } catch (error) {
    console.error("[ERROR] Cannot write output for " + filename + ": " + error.message);
    return 0;
  }

  console.log("  " + filename + ": " + parsedRecords.length + " record(s) -> " + path.basename(outputPath));
  return parsedRecords.length;
}

/**
 * Main entry point.
 */
function main() {
  var sampleFiles;
  var totalRecords = 0;
  var i;

  console.log("=== MARC Sample Parser ===\n");

  // Gather files to process
  try {
    sampleFiles = fs.readdirSync(SAMPLES_DIR)
      .filter(shouldProcess)
      .map(function (f) {
        return path.join(SAMPLES_DIR, f);
      });
  } catch (error) {
    console.error("[FATAL] Cannot read samples directory: " + error.message);
    process.exit(1);
  }

  if (sampleFiles.length === 0) {
    console.warn("No sample files to process.");
    return;
  }

  // Process each file
  for (i = 0; i < sampleFiles.length; i++) {
    totalRecords += processFile(sampleFiles[i]);
  }

  console.log("\nDone. " + totalRecords + " total record(s) parsed across " + sampleFiles.length + " file(s).");
}

main();
