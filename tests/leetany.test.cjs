'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');
const {solutionFromNote,hashCode,safePath,runProcess,codexArgs,reviewPrompt,validateGenerated}=require('../plugins/leetany/core');
test('extract one fenced solution and fingerprint edits',()=>{
 const text='<!-- solution:start -->\n```python\ndef solve(): return 1\n```\n<!-- solution:end -->';
 assert.equal(solutionFromNote(text),'def solve(): return 1');assert.throws(()=>solutionFromNote(text+'\n'+text));
 assert.notEqual(hashCode('a'),hashCode('b'));
});
test('reject path traversal while allowing names with spaces and Cyrillic',()=>{
 assert.equal(safePath('/tmp/vault','Обучение/a b.md'),path.resolve('/tmp/vault/Обучение/a b.md'));
 assert.throws(()=>safePath('/tmp/vault','../secret'));assert.throws(()=>safePath('/tmp/vault','/etc/passwd'));
});
test('Codex gets read-only ephemeral flags and stdin; review treats source as data',()=>{
 const args=codexArgs('/tmp/review.txt');assert.ok(args.includes('read-only'));assert.ok(args.includes('--ephemeral'));assert.equal(args.at(-1),'-');
 assert.ok(!args.includes('--dangerously-bypass-approvals-and-sandbox'));
 const prompt=reviewPrompt({id:'A'},'untrusted', {verdict:'FAILED'});assert.ok(prompt.includes('не делай commit/push'));assert.ok(prompt.includes('FAILED'));
});
test('reject generated complete solutions and malformed tests',()=>{
 const valid={title:'Task',theory:'Theory',statement:'Statement',entry:'solve',starter:'def solve(): raise NotImplementedError',tests:Array.from({length:4},()=>({args:[],expected:null}))};
 assert.equal(validateGenerated(valid),valid);
 assert.throws(()=>validateGenerated({...valid,starter:'def solve(): return 42'}));
 assert.throws(()=>validateGenerated({...valid,tests:[{args:[],expected:1,error:'ValueError'}]}));
});
test('spawn passes text literally without shell evaluation',async()=>{
 const text='$(touch /tmp/not-a-shell) `echo x`\nUnicode: тест';
 const result=await runProcess(process.execPath,['-e','process.stdin.pipe(process.stdout)'],{input:text});assert.equal(result.stdout,text);
});
test('nonzero exit and timeout reported distinctly',async()=>{
 await assert.rejects(runProcess(process.execPath,['-e','process.stderr.write("failure");process.exit(2)']),/failure/);
 await assert.rejects(runProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{timeout:50}),/лимит времени/);
});

// Load the actual Obsidian bundle with only the documented host API stubbed.
// This also detects accidentally unbundled sibling require() calls.
const fs=require('node:fs/promises');const os=require('node:os');
async function pluginFixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leetany-host-'));
 const pluginDir=path.join(root,'plugin');await fs.mkdir(pluginDir);
 for(const file of ['runner.py','worker.py'])await fs.copyFile(path.join(__dirname,'../plugins/leetany',file),path.join(pluginDir,file));
 const bundle=await fs.readFile(path.join(__dirname,'../plugins/leetany/main.js'),'utf8');
 const exported={exports:{}};
 const api={Plugin:class{},ItemView:class{},PluginSettingTab:class{},Modal:class{},Notice:class{},MarkdownRenderer:{}};
 new Function('require','module','exports',bundle)(name=>{
  if(name==='obsidian')return api;
  if(name.startsWith('.'))throw new Error('Obsidian cannot resolve '+name);
  return require(name);
 },exported,exported.exports);
 const plugin=new exported.exports();
 const adapter={getBasePath:()=>root,read:file=>fs.readFile(path.join(root,file),'utf8'),write:(file,text)=>fs.writeFile(path.join(root,file),text),exists:async file=>{try{await fs.access(path.join(root,file));return true;}catch{return false;}},mkdir:folder=>fs.mkdir(path.join(root,folder),{recursive:true})};
 plugin.app={vault:{adapter,getAbstractFileByPath:file=>({path:file})},workspace:{getLeaf:()=>({openFile:async()=>{}})}};
 plugin.manifest={dir:'plugin'};plugin.settings={pythonPath:process.env.LEARNING_LAB_PYTHON||'python3',catalog:'Обучение/LLM/Практикум/catalog.json'};
 plugin.busy=false;
 const exercise={id:'TEST-01',title:'Double',note:'Обучение/LLM/Задачи/test.md',theory:'Знания/test.md',entry:'solve',tests:[{args:[2],expected:4}]};
 const note='<!-- solution:start -->\n```python\ndef solve(x): return 2*x\n```\n<!-- solution:end -->';
 await plugin.save(exercise.note,note);await plugin.save(exercise.theory,'Fixture theory');
 await plugin.save(plugin.settings.catalog,JSON.stringify({version:1,exercises:[exercise]}));
 const view={selected:exercise.id,resultText:'',reviewText:'',render:async()=>{}};
 plugin.catalog=[exercise];
 return {root,plugin,exercise,note,view,cleanup:()=>fs.rm(root,{recursive:true,force:true})};
}
test('actual plugin bridge persists tests and review with matching code hash',async()=>{
 const f=await pluginFixture();
 try{
  let prompt='';f.plugin.codex=async value=>{prompt=value;return '# Ревью\nГотово: корректно на проверенных входах.';};
  await f.plugin.review(f.exercise,f.view);
  const result=JSON.parse(await f.plugin.app.vault.adapter.read(f.plugin.resultPath(f.exercise.id)));
  assert.equal(result.verdict,'PASSED');assert.equal(result.passed,1);assert.equal(result.review_hash,result.code_hash);
  assert.ok(prompt.includes('test_result'));assert.ok((await f.plugin.app.vault.adapter.read(result.review_path)).includes('# Ревью'));
  assert.equal(await f.plugin.app.vault.adapter.read(f.exercise.note),f.note);
  const edited=f.note.replace('2*x','x*2');assert.notEqual(result.code_hash,hashCode(solutionFromNote(edited)));
 }finally{await f.cleanup();}
});
test('actual generation appends task without changing existing learner solution',async()=>{
 const f=await pluginFixture();
 try{
  f.plugin.codex=async()=>JSON.stringify({title:'Increment',theory:'Task explanation',statement:'Return x+1 for an integer x.',entry:'increment',starter:'def increment(x):\n    raise NotImplementedError()',tests:[0,1,2,3].map(x=>({args:[x],expected:x+1}))});
  await f.plugin.generate('increment',f.exercise,f.view);
  const catalog=await f.plugin.loadCatalog();assert.equal(catalog.exercises.length,2);
  const generated=catalog.exercises[1];assert.equal(generated.generated,true);assert.equal(generated.theory,f.exercise.theory);
  assert.ok((await f.plugin.app.vault.adapter.read(generated.note)).includes('NotImplementedError'));
  assert.equal(await f.plugin.app.vault.adapter.read(f.exercise.note),f.note);
 }finally{await f.cleanup();}
});
test('actual review refuses an unfilled exercise without invoking model',async()=>{
 const f=await pluginFixture();
 try{
  await f.plugin.save(f.exercise.note,f.note.replace('return 2*x','raise NotImplementedError()'));
  f.plugin.codex=async()=>{throw new Error('Model must not be called');};
  await assert.rejects(f.plugin.review(f.exercise,f.view),/Сначала напиши решение/);
  assert.equal(f.plugin.busy,false);
 }finally{await f.cleanup();}
});
