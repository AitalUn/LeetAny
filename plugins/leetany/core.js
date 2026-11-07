'use strict';
const { execFile } = require('node:child_process');

const languageNames = {python:'Python', cpp:'C++', rust:'Rust', go:'Go'};

function parseExerciseFile(raw) {
  const course = JSON.parse(raw);
  if (course.version !== 1 || !Array.isArray(course.exercises) || !course.exercises.length)
    throw new Error('Expected version 1 and a nonempty exercises array.');
  const ids = new Set();
  for (const item of course.exercises) {
    for (const field of ['id', 'title', 'statement', 'entry', 'starter'])
      if (typeof item?.[field] !== 'string' || !item[field].trim()) throw new Error('Missing ' + field);
    if (ids.has(item.id) || !/^[A-Za-z_]\w*$/.test(item.entry)) throw new Error('Invalid entry or duplicate exercise ID.');
    ids.add(item.id);
    if (item.language !== undefined && !Object.hasOwn(languageNames, item.language))
      throw new Error('Unsupported language in ' + item.id);
    if (item.language && item.language !== 'python' && typeof item.harness !== 'string')
      throw new Error('Missing native test harness in ' + item.id);
    if (item.parameters !== undefined && (!Array.isArray(item.parameters) || !item.parameters.every(x=>typeof x === 'string')))
      throw new Error('Invalid parameter names in ' + item.id);
    if (item.solution !== undefined && typeof item.solution !== 'string') throw new Error('Invalid solution.');
    if (!Array.isArray(item.tests) || !item.tests.length) throw new Error('Tests are required.');
    for (const test of item.tests) {
      if (!Array.isArray(test?.args) || Object.hasOwn(test,'expected') === Object.hasOwn(test,'error') ||
          (Object.hasOwn(test,'error') && typeof test.error !== 'string')) throw new Error('Invalid test in ' + item.id);
    }
  }
  return course;
}

function runTests(python, argv, exercise, code) {
  return new Promise((resolve, reject) => {
    const command = Array.isArray(argv) ? argv : [argv, '--stdin'];
    const timeout = Math.min(2147483647, (600 * (exercise.tests.length + 1) + 15) * 1000);
    const child = execFile(python, command, {timeout, maxBuffer:2*1024*1024}, (err,stdout,stderr)=>{
      try { resolve(JSON.parse(stdout)); }
      catch { reject(new Error(stderr || err?.message || 'Invalid test report')); }
    });
    child.stdin.on('error',reject);
    child.stdin.end(JSON.stringify({exercise,code}));
  });
}
function fingerprint(task) {
  const {createHash} = require('node:crypto');
  const contract = [task.id, task.statement, task.entry, task.solution ?? task.starter, task.tests];
  if (task.language && task.language !== 'python') contract.push(task.language, task.harness);
  return createHash('sha256').update(JSON.stringify(contract)).digest('hex');
}
function isComplete(course) {
  return course.exercises.every(task => task.passedHash === fingerprint(task));
}
module.exports = {languageNames, parseExerciseFile, runTests, fingerprint, isComplete};
