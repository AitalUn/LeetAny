'use strict';
const {randomUUID} = require('node:crypto');
const {runTests} = require('./core');
const scripts = {
  'runner.py': require('../../.agents/skills/leetany-course/scripts/runner.py'),
  'worker.py': require('../../.agents/skills/leetany-course/scripts/worker.py'),
  'course_runner.py': require('../../.agents/skills/leetany-course/scripts/course_runner.py')
};

async function runBundledTests(plugin, course, exercise, code) {
  const {adapter} = plugin.app.vault;
  const folder = plugin.manifest.dir + '/run-' + randomUUID();
  await adapter.mkdir(folder);
  try {
    for (const [name, contents] of Object.entries(scripts)) {
      await adapter.write(folder + '/' + name, contents);
    }
    const runner = adapter.getFullPath(folder + '/course_runner.py');
    return await runTests(plugin.settings.pythonPath, ['-B', runner, 'stdin', course], exercise, code);
  } finally {
    await adapter.rmdir(folder, true);
  }
}
module.exports = {runBundledTests, scripts};
