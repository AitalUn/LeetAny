const test=require('node:test'), assert=require('node:assert/strict'), path=require('node:path');
const {parseExerciseFile,runTests,isComplete,fingerprint}=require('../plugins/leetany/core');
const task={id:'a',title:'Double',statement:'Double x',entry:'double',starter:'def double(x): return 2*x',tests:[{args:[2],expected:4}]};
test('completion requires current passing results for every exercise',()=>{
 const course=parseExerciseFile(JSON.stringify({version:1,exercises:[task,{...task,id:'b'}]}));
 assert.equal(isComplete(course),false);
 for(const t of course.exercises)t.passedHash=fingerprint(t);
 assert.equal(isComplete(course),true);
 course.exercises[0].solution='def double(x): return x';assert.equal(isComplete(course),false);
 delete course.exercises[0].solution;course.exercises[0].tests[0].expected=9;assert.equal(isComplete(course),false);
});
test('reject ambiguous test expectations',()=>assert.throws(()=>parseExerciseFile(JSON.stringify({version:1,exercises:[{...task,tests:[{args:[],expected:1,error:'ValueError'}]}]}))));
test('run the standalone exercise with the shipped Python worker',async()=>{
 const runner=path.resolve(__dirname,'../.agents/skills/leetany-course/scripts/runner.py');
 assert.equal((await runTests('python3',[runner,'--stdin'],task,task.starter)).verdict,'PASSED');
 assert.equal((await runTests('python3',[runner,'--stdin'],task,'def double(x): return x')).verdict,'FAILED');
});

test('native completion belongs to the harness and language that actually ran',()=>{
 const native={...task, language:'cpp', harness:'#include "solution.cpp"'};
 const course=parseExerciseFile(JSON.stringify({version:1,exercises:[native]}));
 const exercise=course.exercises[0]; exercise.passedHash=fingerprint(exercise);
 assert.equal(isComplete(course),true);
 exercise.harness+=' // updated'; assert.equal(isComplete(course),false);
 assert.throws(()=>parseExerciseFile(JSON.stringify({version:1,exercises:[{...native,language:'unknown'}]})));
});
