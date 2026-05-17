import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { resolve, dirname, basename, join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  loadFile,
  groupByExtension,
  findMultiExtensionInstructions,
  printSummary,
} from '../src/parser.js';

import { crossReference } from '../src/crossref.js';

import {
  buildSharedInstructionGraph,
  renderTextGraph,
  renderMermaidGraph,
} from '../src/graph.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

app.post('/api/analyze', upload.fields([
  { name: 'instrDict', maxCount: 1 },
  { name: 'asciidocs' }
]), (req, res) => {
  try {
    const useDefaultJson = req.body.useDefaultJson === 'true';
    const manualOption = req.body.manualOption; // 'clone', 'upload', 'none'
    
    let jsonPath = resolve(__dirname, '../instr_dict.json');
    if (!useDefaultJson && req.files && req.files.instrDict) {
      jsonPath = req.files.instrDict[0].path;
    }

    if (!existsSync(jsonPath)) {
      return res.status(400).json({ error: 'instr_dict.json not found' });
    }

    const instrDict = loadFile(jsonPath);
    const groups = groupByExtension(instrDict);
    const multiExt = findMultiExtensionInstructions(instrDict);
    
    const summaryTable = printSummary(groups);
    const totalInstructions = Object.keys(instrDict).length;

    const adjacency = buildSharedInstructionGraph(instrDict);
    const textGraph = renderTextGraph(adjacency);
    const mermaidGraph = renderMermaidGraph(adjacency);

    let crossRefResult = null;

    if (manualOption === 'clone') {
      const manualSrc = resolve(__dirname, 'uploads/cloned-manual/src');
      if (!existsSync(manualSrc)) {
        mkdirSync(dirname(manualSrc), { recursive: true });
        execSync(
          `git clone --depth 1 https://github.com/riscv/riscv-isa-manual.git "${dirname(manualSrc)}"`,
          { stdio: 'inherit' }
        );
      }
      if (existsSync(manualSrc)) {
        const jsonExtTags = [...new Set(Object.values(instrDict).flatMap(m => m.extension ?? []))];
        crossRefResult = crossReference(jsonExtTags, manualSrc);
      }
    } else if (manualOption === 'upload' && req.files && req.files.asciidocs) {
      const manualSrc = resolve(__dirname, 'uploads/manual-uploaded');
      const paths = [].concat(req.body.asciidocPaths || []);
      
      req.files.asciidocs.forEach((file, index) => {
        const relativePath = paths[index] || file.originalname;
        const dest = join(manualSrc, relativePath);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, readFileSync(file.path));
      });
      const jsonExtTags = [...new Set(Object.values(instrDict).flatMap(m => m.extension ?? []))];
      crossRefResult = crossReference(jsonExtTags, manualSrc);
    }

    // Convert Sets and Maps to arrays/objects for JSON serialization
    if (crossRefResult) {
      crossRefResult.normMap = Array.from(crossRefResult.normMap.entries()).map(([k, v]) => [k, Array.from(v)]);
    }

    res.json({
      totalInstructions,
      totalExtensions: groups.size,
      summaryTable,
      multiExt,
      textGraph,
      mermaidGraph,
      crossRefResult
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
