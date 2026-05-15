/**
 * crossref/scanner-legacy.js : Legacy scanner (broad regex + blocklist).
 *
 * Preserved for A/B benchmarking against the optimized scanner.
 * Not used in production cross-referencing.
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { collectAdocFiles, NON_EXTENSION_FILES } from "./utils.js";

// LEGACY: Broad regex dragnet + blocklist approach.
export function scanManualLegacy(srcDir, knownNormalized) {
  const found = new Set();
  const adocFiles = collectAdocFiles(srcDir);

  const singleLetterPattern =
    /\b(?:the\s+|extension\s+|RV(?:32|64|128)?)(I|M|A|F|D|C|Q|V|B|H|S|U|N)\b/gi;

  // Phase 1: Filenames
  for (const filePath of adocFiles) {
    const name = basename(filePath, ".adoc").toLowerCase();
    const fileExtName = name.replace(/-st-ext$/, "");

    if (NON_EXTENSION_FILES.has(fileExtName)) continue;
    if (fileExtName.includes("-")) continue;
    if (/^[a-z][a-z0-9]*$/i.test(fileExtName) && fileExtName.length <= 20) {
      found.add(fileExtName.toLowerCase());
    }
  }

  // Phase 2: Content : broad regex sweeps
  for (const filePath of adocFiles) {
    const content = readFileSync(filePath, "utf-8");
    let match;

    // Z-extensions
    const zFalsePositives = new Set([
      "zero",
      "zeroed",
      "zeroes",
      "zeroing",
      "zeroization",
      "zeroized",
      "zeroness",
      "zeros",
      "zeroth",
      "zext",
      "zhang",
      "zip",
      "zone",
      "zoom",
      "zandijk",
      "zabrocki",
    ]);
    const zPattern = /\b(Z[a-z][a-z0-9]{0,18})\b/gi;
    while ((match = zPattern.exec(content)) !== null) {
      const candidate = match[1].toLowerCase();
      const afterIdx = match.index + match[0].length;
      if (afterIdx < content.length && content[afterIdx] === "_") continue;
      if (zFalsePositives.has(candidate)) continue;
      found.add(candidate);
    }

    // S-family: Sv*, Sm*, Ss*, Sh*, Sd*, Sn*
    for (const [pat, filter] of [
      [/\b(Sv[a-z][a-z0-9]{0,16})\b/gi, null],
      [
        /\b(Sm[a-z][a-z0-9]{0,16})\b/gi,
        /^(small|smart|smooth|smoke|smith|smit|smell)/,
      ],
      [/\b(Ss[a-z][a-z0-9]{0,16})\b/gi, null],
      [/\b(Sh[cgtvl][a-z0-9]{0,16})\b/gi, null],
      [/\b(Sd[a-z][a-z0-9]{0,16})\b/gi, null],
      [
        /\b(Sn[a-z][a-z0-9]{0,16})\b/gi,
        /^(snap|snip|snow|snare|snake|snan|snez|snoop|snooping)/,
      ],
    ]) {
      while ((match = pat.exec(content)) !== null) {
        const candidate = match[1].toLowerCase();
        const afterIdx = match.index + match[0].length;
        if (afterIdx < content.length && content[afterIdx] === "_") continue;
        if (filter && filter.test(candidate)) continue;
        found.add(candidate);
      }
    }

    // Single-letter in context
    while ((match = singleLetterPattern.exec(content)) !== null) {
      found.add(match[1].toLowerCase());
    }
  }

  // Phase 3: Remove known non-extensions
  const knownNonExtensions = new Set([
    "sstatus",
    "sstatush",
    "sstatusreg",
    "sscratch",
    "sseed",
    "sse",
    "ssi",
    "ssie",
    "ssip",
    "ssp",
    "sspm",
    "ssamoswap",
    "sspopchk",
    "sspush",
    "ssrdp",
    "ssptead",
    "snez",
    "snan",
    "sh",
    "sm",
    "ss",
    "sv",
    "sd",
    "sn",
    "sha",
    "sha2",
    "sha3",
    "sha256",
    "sha512",
    "sha256sig0",
    "sha256sig1",
    "sha256sum0",
    "sha256sum1",
    "sha512sig0",
    "sha512sig0h",
    "sha512sig0l",
    "sha512sig1",
    "sha512sig1h",
    "sha512sig1l",
    "sha512sum0",
    "sha512sum0r",
    "sha512sum1",
    "sha512sum1r",
    "sml",
    "smt",
    "sseteienum",
    "sseteipnum",
    "ssghi",
    "ssmp",
    "ssnpm",
    "shmno",
    "shlcofideleg",
    "za",
    "zb",
    "zc",
    "zf",
    "zi",
    "zk",
    "zm",
    "zp",
    "zv",
    "zve",
    "zve32",
    "zvl",
    "b",
    "n",
  ]);

  for (const token of knownNonExtensions) {
    found.delete(token);
  }

  return found;
}
