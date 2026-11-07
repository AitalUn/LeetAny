'use strict';
const {Plugin, TextFileView, PluginSettingTab, Setting, Notice, setIcon} = require('obsidian');
const path = require('node:path');
const {TestPanel} = require('./test-panel');
const {createPythonEditor} = require('./editor');
const {parseExerciseFile, runTests, fingerprint, isComplete} = require('./core');

class PracticeView extends TextFileView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.index = 0; }
  getViewType() { return 'leetany-practice'; }
  getDisplayText() { return this.file?.basename || 'LeetAny'; }
  getIcon() { return 'code-2'; }
  getViewData() { return this.raw ?? ''; }
  disposeEditor() { this.editor?.destroy(); this.editor = null; }
  async onClose() { this.disposeEditor(); await super.onClose(); }
  clear() { this.disposeEditor(); this.raw = ''; this.course = null; this.contentEl.empty(); }
  setViewData(raw, clear) {
    this.raw = raw;
    if (clear) this.index = 0;
    try { this.course = parseExerciseFile(raw); this.draw(); }
    catch (err) { this.disposeEditor(); this.course = null; this.contentEl.empty(); this.contentEl.createEl('p',{text:'Invalid .leetany file: '+err.message}); }
  }
  draw() {
    const root = this.contentEl;
    this.disposeEditor();
    root.empty(); root.addClass('leetany-view');
    const courses = this.course.exercises;
    this.index = Math.min(this.index, courses.length-1);
    const task = courses[this.index];
    const grid = root.createDiv({cls:'leetany-grid'});
    const description = grid.createDiv({cls:'leetany-panel leetany-description'});
    const heading = description.createDiv({cls:'leetany-panel-bar'});
    setIcon(heading.createSpan(),'file-text');
    heading.createSpan({text:'Условие'});
    const left = description.createDiv({cls:'leetany-problem'});
    if (courses.length > 1) {
      const select = left.createEl('select',{attr:{'aria-label':'Задача'}});
      courses.forEach((e,i)=>{const opt=select.createEl('option',{text:e.title});opt.value=String(i);});
      select.value=String(this.index);
      select.onchange=()=>{this.index=Number(select.value);this.draw();};
    }
    left.createEl('h2',{text:task.title});
    left.createEl('p',{cls:'leetany-statement',text:task.statement});
    if(task.example) {
      left.createEl('h3',{text:'Пример'});
      left.createEl('pre',{cls:'leetany-example',text:task.example});
    }
    const right=grid.createDiv({cls:'leetany-work'});
    const codePanel=right.createDiv({cls:'leetany-panel leetany-code-panel'});
    const bar=codePanel.createDiv({cls:'leetany-panel-bar'});
    setIcon(bar.createSpan(),'code-xml');
    bar.createSpan({text:'Код'});
    bar.createSpan({text:'Python',cls:'leetany-language'});
    const run=bar.createEl('button',{text:'Запустить тесты',cls:'leetany-run'});
    const surface=codePanel.createDiv({cls:'leetany-editor'});
    const panel=new TestPanel(right,task);
    const editor=createPythonEditor(surface,task.solution ?? task.starter,code=>{
      task.solution=code;
      this.raw=JSON.stringify(this.course,null,2)+'\n';
      this.requestSave();
      panel.invalidate();
    });
    this.editor=editor;
    run.onclick=async()=>{
      const code=editor.state.doc.toString();
      const signature=fingerprint(task);
      run.disabled=true;panel.begin();
      try {
        await this.save();
        const file=path.join(this.app.vault.adapter.getBasePath(),this.plugin.manifest.dir,'runner.py');
        const report=await runTests(this.plugin.settings.pythonPath,file,task,code);
        if(this.course?.exercises.includes(task) && fingerprint(task)===signature) {
          if(report.verdict==='PASSED') task.passedHash=signature;
          else delete task.passedHash;
          this.raw=JSON.stringify(this.course,null,2)+'\n';
          await this.save();
        }
        if (this.editor === editor && fingerprint(task) === signature) panel.finish(report);
      } catch(err) {
        if (this.editor === editor && fingerprint(task) === signature) panel.finish({verdict:'ERROR',message:err.message});
      } finally {run.disabled=false;}
    };
  }
}
module.exports = class LeetAny extends Plugin {
  async onload(){
    this.settings={pythonPath:'python3',...await this.loadData()};
    this.registerView('leetany-practice',leaf=>new PracticeView(leaf,this));
    this.registerExtensions(['leetany'],'leetany-practice');
    this.addCommand({id:'install-course-skill',name:'Установить skill для создания курсов',callback:async()=>{
      try {
        const adapter=this.app.vault.adapter;
        const skill=await adapter.read(this.manifest.dir+'/SKILL.md');
        const kept=[];
        for(const root of ['.agents','.claude']) {
          const folder=root+'/skills/leetany-course';
          for(const dir of [root,root+'/skills',folder]) {
            if(!await adapter.exists(dir)) await adapter.mkdir(dir);
          }
          const file=folder+'/SKILL.md';
          if(!await adapter.exists(file)) await adapter.write(file,skill);
          else {
            const existing=await adapter.read(file);
            if(existing===skill) continue;
            const hash=require('node:crypto').createHash('sha256').update(existing.replace(/\r\n/g,'\n')).digest('hex');
            if(hash==='938a1a1f6cf9b2fa20ee5559d6722ecfe47c9c0b138fca0dff70702bf2fb4f84') await adapter.write(file,skill);
            else kept.push(file);
          }
        }
        const hint=await adapter.read(this.manifest.dir+'/agent-hint.md');
        const marker=hint.split(/\r?\n/)[0];
        for(const filename of ['AGENTS.md','CLAUDE.md']) {
          const file=this.app.vault.getAbstractFileByPath(filename);
          if(file) await this.app.vault.process(file,text=>
            text.split(/\r?\n/).includes(marker)?text:text+(text?'\n\n':'')+hint);
          else await this.app.vault.create(filename,hint);
        }
        new Notice(kept.length?'Сохранены локальные версии: '+kept.join(', '):'Skill leetany-course установлен');
      } catch(error) {new Notice(error.message);}
    }});
    this.app.workspace.onLayoutReady(()=>this.setupBadges());
    const plugin=this;
    this.addSettingTab(new class extends PluginSettingTab {
      display(){this.containerEl.empty();new Setting(this.containerEl).setName('Python 3.10+').addText(t=>t.setValue(plugin.settings.pythonPath).onChange(async v=>{plugin.settings.pythonPath=v.trim();await plugin.saveData(plugin.settings);}));}
    }(this.app,this));
  }
  setupBadges() {
    const marks=new Map(), revisions=new WeakMap();
    const paint=()=>{
      for(const el of this.app.workspace.containerEl.querySelectorAll('.nav-file-title[data-path]')) {
        const name=el.dataset.path;
        if(name.endsWith('.leetany')) el.dataset.leetanyBadge=marks.get(name)||'❌';
        else delete el.dataset.leetanyBadge;
      }
    };
    const update=async file=>{
      if(file.extension!=='leetany') return;
      const revision=(revisions.get(file)||0)+1;
      revisions.set(file,revision);
      let mark='❌';
      try { if(isComplete(parseExerciseFile(await this.app.vault.cachedRead(file)))) mark='✅'; } catch {}
      if(revisions.get(file)===revision){marks.set(file.path,mark);paint();}
    };
    for(const event of ['create','modify']) this.registerEvent(this.app.vault.on(event,update));
    this.registerEvent(this.app.vault.on('rename',(file,old)=>{marks.delete(old);update(file);paint();}));
    this.registerEvent(this.app.vault.on('delete',file=>{marks.delete(file.path);paint();}));
    const observer=new MutationObserver(paint);
    observer.observe(this.app.workspace.containerEl,{subtree:true,childList:true,attributes:true,attributeFilter:['data-path']});
    this.register(()=>{observer.disconnect();for(const el of this.app.workspace.containerEl.querySelectorAll('[data-leetany-badge]'))delete el.dataset.leetanyBadge;});
    this.app.vault.getFiles().filter(f=>f.extension==='leetany').forEach(update);
    paint();
  }
};
