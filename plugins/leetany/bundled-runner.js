'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {runTests} = require('./core');
const runner = require('./runner.py');
const worker = require('./worker.py');

async function runBundledTests(python, exercise, code) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'leetany-runner-'));
  const entry = path.join(folder, 'runner.py');
  try {
    await fs.writeFile(entry, runner);
    await fs.writeFile(path.join(folder, 'worker.py'), worker);
    return await runTests(python, entry, exercise, code);
  } finally {
    await fs.rm(folder, {force: true, recursive: true});
  }
}
module.exports = {runBundledTests};
