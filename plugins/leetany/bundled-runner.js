'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {runTests} = require('./core');
const scripts = {
  'runner.py': require('../../.agents/skills/leetany-course/scripts/runner.py'),
  'worker.py': require('../../.agents/skills/leetany-course/scripts/worker.py'),
  'course_runner.py': require('../../.agents/skills/leetany-course/scripts/course_runner.py')
};

async function runBundledTests(python, course, exercise, code) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'leetany-runner-'));
  try {
    for (const [name, contents] of Object.entries(scripts)) {
      await fs.writeFile(path.join(folder, name), contents);
    }
    return await runTests(python, [path.join(folder, 'course_runner.py'), 'stdin', course], exercise, code);
  } finally {
    await fs.rm(folder, {force: true, recursive: true});
  }
}
module.exports = {runBundledTests, scripts};
