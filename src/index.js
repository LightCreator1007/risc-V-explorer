#!/usr/bin/env node
import { resolve, dirname, basename } from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

import {
  loadFile,
  groupByExtension,
  findMultiExtensionInstructions,
  printSummary,
} from "./parser.js";

import { crossReference } from "./crossref.js";

import {
  buildSharedInstructionGraph,
  renderTextGraph,
  renderMermaidGraph,
} from "./graph.js";

function parseArgs(argv) {
  const args = {
    jsonPath: "./instr_dict.json",
    manualSrc: "./riscv-isa-manual/src",
    mermaid: false,
  };

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case "--json-path":
        args.jsonPath = argv[++i];
        break;
      case "--manual-src":
        args.manualSrc = argv[++i];
        break;
      case "--mermaid":
        args.mermaid = true;
        break;
      default:
        console.error(`Unkown argument: ${argv[i]}`);
        process.exit(1);
    }
  }

  return args;
}

//Colour-Helpers (ANSI) ---------

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const MAGENTA = "\x1b[35m";

function heading(text) {
  console.log();
  console.log(`${BOLD}${CYAN}${"=".repeat(70)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${text}${RESET}`);
  console.log(`${BOLD}${CYAN}${"═".repeat(70)}${RESET}`);
  console.log();
}

function subheading(text) {
  console.log(`${BOLD}${YELLOW}  ─── ${text} ───${RESET}`);
  console.log();
}

//Main section

function main() {
  const args = parseArgs(process.argv);
  const jsonPath = resolve(args.jsonPath);
  const manualSrc = resolve(args.manualSrc);

  // We need to validate the inputs
  if (!existsSync(jsonPath)) {
    console.error(
      `${RED}ERROR:${RESET} instr_dict.json not found at: ${jsonPath}`,
    );
    console.error(
      `  Download it from: https://github.com/rpsene/riscv-extensions-landscape`,
    );
    console.error(`  Expected path:    src/instr_dict.json in that repo`);
    process.exit(1);
  }

  if (!existsSync(manualSrc)) {
    console.error(
      `${YELLOW}WARNING:${RESET} ISA manual not found at: ${manualSrc}`,
    );
    console.log(
      `${CYAN}Attempting to clone the repository automatically...${RESET}`,
    );

    try {
      const cloneTarget =
        basename(manualSrc) === "src" ? dirname(manualSrc) : manualSrc;
      console.log(
        ` Running: git clone --depth 1 https://github.com/riscv/riscv-isa-manual.git ${cloneTarget}\n`,
      );

      execSync(
        `git clone --depth 1 https://github.com/riscv/riscv-isa-manual.git "${cloneTarget}"`,
        {
          stdio: "inherit",
        },
      );
      if (existsSync(manualSrc)) {
        console.log(
          `\n${GREEN}✓ Successfully cloned the ISA manual!${RESET}\n`,
        );
      } else {
        console.log(
          `\n${RED}✗ Clone completed, but ${manualSrc} is still missing. Skipping Tier 2.${RESET}\n`,
        );
      }
    } catch (error) {
      console.error(
        `\n${RED}✗ Failed to clone the repository. Do you have git installed?${RESET}`,
      );
      console.error(`  Error: ${error.message}`);
      console.error(`  Tier 2 (cross-reference) will be skipped.\n`);
    }
  }

  //instruction set parsing
  const instrDict = loadFile(jsonPath);
  const totalInstructions = Object.keys(instrDict).length;
  console.log(`  ${DIM}Source:${RESET}${jsonPath}`);
  console.log(
    `  ${DIM}Total instructions parsed:${RESET} ${BOLD}${totalInstructions}${RESET}`,
  );
  console.log();

  subheading("Extension summary table");

  const groups = groupByExtension(instrDict);
  const tableLines = printSummary(groups);
  for (const line of tableLines) {
    console.log(`  ${line}`);
  }
  console.log();
  console.log(
    `  ${DIM}Total extensions:${RESET} ${BOLD}${groups.size}${RESET}`,
  );

  subheading("Instructinons belonging to multiple extensions");
  const multiExt = findMultiExtensionInstructions(instrDict);
  if (multiExt.lenght === 0) {
    console.log("  (none found)");
  } else {
    console.log(
      `  ${DIM}Found ${BOLD}${multiExt.length}${RESET}${DIM} instructions in multiple extensions:${RESET}`,
    );
    console.log();
    for (const { mnemonic, extensions } of multiExt) {
      console.log(
        ` ${GREEN}${mnemonic.toUpperCase().padEnd(20)}${RESET} -> ${extensions.join(", ")}`,
      );
    }
  }

  //cross-reference with isa-manual
  if (existsSync(manualSrc)) {
    heading("Cross-Reference with ISA-Manual");

    const jsonExtTags = [
      ...new Set(Object.values(instrDict).flatMap((m) => m.extension ?? [])),
    ];

    console.log(`  ${DIM}ISA Manual source dir:${RESET} ${manualSrc}`);
    console.log(`  ${DIM}JSON extension tags:${RESET} ${jsonExtTags.length}`);
    console.log();

    const {
      matched,
      jsonOnly,
      manualOnly,
      compoundMatched,
      prefixMatched,
      normMap,
    } = crossReference(jsonExtTags, manualSrc);

    //Count summary
    subheading("Count Summary");
    console.log(
      `  ${GREEN}${matched.length} exact matched${RESET}, ` +
        `${CYAN}${compoundMatched.length} compound matched${RESET}, ` +
        `${MAGENTA}${prefixMatched.length} prefix matched${RESET}, ` +
        `${YELLOW}${jsonOnly.length} in JSON only${RESET}, ` +
        `${RED}${manualOnly.length} in manual only${RESET}`,
    );
    console.log();

    subheading("Matched Extensions (in both JSON and ISA manual)");
    for (const ext of matched) {
      const origTags = [...normMap.get(ext)].join(", ");
      console.log(
        `  ${GREEN}✓${RESET} ${ext.padEnd(20)} ${DIM}(JSON tags: ${origTags})${RESET}`,
      );
    }
    console.log();

    //compound matched extensions
    if (compoundMatched.length > 0) {
      subheading(
        "Compound-Matched Extensions (all constituent parts verified)",
      );
      for (const { compound, parts } of compoundMatched) {
        const origTags = [...normMap.get(compound)].join(", ");
        console.log(
          `  ${CYAN}◆${RESET} ${compound.padEnd(20)} ${DIM}= ${parts.join(" + ")}  (JSON tags: ${origTags})${RESET}`,
        );
      }
      console.log();
    }

    //prefix matched extensions
    if (prefixMatched.length > 0) {
      subheading("Prefix-Matched Extensions (umbrella → sub-extension family)");
      for (const { parent, family } of prefixMatched) {
        const origTags = [...normMap.get(parent)].join(", ");
        console.log(
          `  ${MAGENTA}⊃${RESET} ${parent.padEnd(20)} ${DIM}→ family: ${family.join(", ")}  (JSON tags: ${origTags})${RESET}`,
        );
      }
      console.log();
    }

    // JSON-only
    subheading("Extensions in JSON Only (not found in ISA manual)");
    if (jsonOnly.length === 0) {
      console.log("  (none)");
    } else {
      for (const ext of jsonOnly) {
        const origTags = [...normMap.get(ext)].join(", ");
        console.log(
          `  ${YELLOW}⚠${RESET} ${ext.padEnd(20)} ${DIM}(JSON tags: ${origTags})${RESET}`,
        );
      }
    }
    console.log();

    // Manual-only
    subheading("Extensions in ISA Manual Only (not in JSON)");
    if (manualOnly.length === 0) {
      console.log("  (none)");
    } else {
      for (const ext of manualOnly) {
        console.log(`  ${RED}✗${RESET} ${ext}`);
      }
    }
  }

  //Shared Instruction Graph
  heading("Tier 3: Shared-Instruction Graph (Bonus)");
  const adjacency = buildSharedInstructionGraph(instrDict);

  if (adjacency.size === 0) {
    console.log("  No shared instructions found between extensions");
  } else {
    const textLines = renderMermaidGraph(adjacency);
    for (const line of textLines) {
      console.log(line);
    }

    if (args.mermaid) {
      console.log();
      console.log("Mermaid Graph Definition: ");
      console.log(renderMermaidGraph(adjacency));
    }
  }

  console.log();
  console.log(`${BOLD}${GREEN}Done!${RESET}`);
  console.log();
}

main();
