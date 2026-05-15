/*
INSTRUCTION SET PARSING

1. Read instr_dict.json, group instructions by extension.
2. Identify multi-extension instructions.
*/

import { readFileSync } from "node:fs";

function loadFile(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

//grouping instructions by execution tag
function groupByExtension(instrDict) {
  const groups = new Map();

  for (const [mnemonic, meta] of Object.entries(instrDict)) {
    const extensions = meta.extension ?? [];
    for (const extension of extensions) {
      if (!groups.has(extension)) {
        groups.set(extension, []);
      }
      groups.get(extension).push(mnemonic);
    }
  }

  return new Map(
    [...groups.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true }),
    ),
  );
}

//Identify instructions that belong to more than one extension
function findMultiExtensionInstructions(instrDict) {
  const res = [];
  for (const [mnemonic, meta] of Object.entries(instrDict)) {
    const extensions = meta.extension ?? [];
    if (extensions.length > 1) {
      res.push({ mnemonic, extensions: [...extensions].sort() });
    }
  }
  return res.sort((a, b) => a.mnemonic.localeCompare(b.mnemonic));
}

function printSummary(groups) {
  //column width for alingment of printed text
  let maxExtLen = 0;
  let maxCountLen = 0;

  for (const [ext, mnemonics] of groups) {
    maxExtLen = Math.max(maxExtLen, ext.length);
    maxCountLen = Math.max(maxCountLen, mnemonics.length);
  }

  const lines = [];
  for (const [ext, mnemonics] of groups) {
    const count = mnemonics.length;
    const example = mnemonics[0].toUpperCase();
    const paddedExt = ext.padEnd(maxExtLen);
    const paddedCount = String(count).padStart(maxCountLen);
    lines.push(
      `${paddedExt} | ${paddedCount} instruction${count === 1 ? " " : "s"} | e.g. ${example}`,
    );
  }
  return lines;
}

export {
  loadFile,
  groupByExtension,
  findMultiExtensionInstructions,
  printSummary,
};
