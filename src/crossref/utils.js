/*
Shared constants and helper for extension scanning
*/

import { readdirSync } from "node:fs";
import { join } from "node:path";

//match strings shaped like RISC-V extension names
const EXT_SHAPE =
  /^(?:z[a-z][a-z0-9]*|s[vmshdn][a-z][a-z0-9]*|[imafdcqvbhsun])$/i;

//Escape special regex chars for dynamic RegExp construction.
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

//Recursive function to collect all .adoc file paths under a directory.
function collectAdocFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectAdocFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".adoc")) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Structural/chapter .adoc filenames that are NOT extension names. */
const NON_EXTENSION_FILES = new Set([
  "base",
  "intro",
  "preface",
  "rationale",
  "bibliography",
  "contributors",
  "index",
  "license",
  "symbols",
  "naming",
  "code-examples",
  "bitmanip-examples",
  "atomics-examples",
  "vector-examples",
  "vector-common",
  "memory-models",
  "mm-appendix",
  "mm-explanatory",
  "mm-formal",
  "rv-32-64g",
  "rv32",
  "rv32e",
  "rv64",
  "rvwmo",
  "rvbna",
  "csrs",
  "insns",
  "machine",
  "supervisor",
  "hypervisor",
  "priv",
  "unpriv",
  "riscv-spec",
  "profiles",
  "matrix",
  "cfi",
  "crypto",
  "cmo",
  "rva20",
  "rva22",
  "rva23",
  "rvb23",
  "rvi20",
]);

export { NON_EXTENSION_FILES, EXT_SHAPE, escapeRegExp, collectAdocFiles };
