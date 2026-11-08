'use strict';
const {Plugin, TextFileView, PluginSettingTab, Setting, Notice, setIcon} = require('obsidian');
const path = require('node:path');
const {runBundledTests, scripts} = require('./bundled-runner');
const skill = require('../../.agents/skills/leetany-course/SKILL.md');
const hint = require('./agent-hint.md');
const {addColumnSplitter} = require('./splitter');
const {showDescription} = require('./description');
const {TestPanel} = require('./test-panel');
const {createCodeEditor} = require('./editor');
const bundledStyles = require('./styles.css');
const {languageNames, parseExerciseFile, fingerprint, isComplete} = require('./core');

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
    const language=task.language ?? 'python';
    const grid = root.createDiv({cls:'leetany-grid'});
    const description = grid.createDiv({cls:'leetany-panel leetany-description'});
    showDescription(description,this,task,courses);
    addColumnSplitter(grid,this.plugin.settings.descriptionWidth,share=>{
      this.plugin.settings.descriptionWidth=share;
      this.plugin.saveData(this.plugin.settings).catch(error=>new Notice(error.message));
    });
    const right=grid.createDiv({cls:'leetany-work'});
    const codePanel=right.createDiv({cls:'leetany-panel leetany-code-panel'});
    const bar=codePanel.createDiv({cls:'leetany-panel-bar'});
    setIcon(bar.createSpan(),'code-xml');
    bar.createSpan({text:'Code'});
    bar.createSpan({text:languageNames[language],cls:'leetany-language'});
    const run=bar.createEl('button',{text:'Run tests',cls:'leetany-run'});
    const surface=codePanel.createDiv({cls:'leetany-editor'});
    const panel=new TestPanel(right,task);
    const editor=createCodeEditor(surface,language,task.solution ?? task.starter,code=>{
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
        const directory=path.dirname(this.app.vault.adapter.getFullPath(this.file.path));
        await this.save();
        const report=await runBundledTests(this.plugin.settings.pythonPath,directory,task,code);
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
  async useBundledStylesIfMissing() {
    const {adapter} = this.app.vault;
    const file = this.manifest.dir + '/styles.css';
    if (await adapter.exists(file) && (await adapter.read(file)).trim()) return;

    // Obsidian can finish installing a plugin even when its optional CSS download fails.
    const doc = this.app.workspace.containerEl.ownerDocument;
    const style = doc.createElement('style');
    style.textContent = bundledStyles;
    doc.head.appendChild(style);
    this.register(() => style.remove());
  }
  async onload(){
    await this.useBundledStylesIfMissing();
    this.settings={pythonPath:'python3',...await this.loadData()};
    this.registerView('leetany-practice',leaf=>new PracticeView(leaf,this));
    this.registerExtensions(['leetany'],'leetany-practice');
    this.addCommand({id:'add-sample-course',name:'Add sample LLM course',callback:async()=>{
      try {
        const vault=this.app.vault;
        const folder=vault.getFolderByPath('Обучение/LLM') ? 'Обучение/LLM' : 'Courses/LLM';
        const parent=folder.split('/')[0];
        if (!vault.getFolderByPath(parent)) await vault.createFolder(parent);
        if (!vault.getFolderByPath(folder)) await vault.createFolder(folder);
        for (const [name, text] of Object.entries(LEETANY_SAMPLE_COURSE)) {
          const path=folder+'/'+name;
          if (!vault.getAbstractFileByPath(path)) await vault.create(path,text);
        }
        new Notice('Sample exercises are available in '+folder);
      } catch(error) { new Notice(error.message); }
    }});
    this.addCommand({id:'install-course-skill',name:'Install course authoring skill',callback:async()=>{
      try {
        const adapter=this.app.vault.adapter;

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
            if(['938a1a1f6cf9b2fa20ee5559d6722ecfe47c9c0b138fca0dff70702bf2fb4f84','15acb72848dfb6d5b20d951c2a17829450073cd5e77767e7a8e6967e7895732f','1a9604d4929a06517d5ce92265239d40a241695a3538729ccd92250164176a75','b56ef44937490907f74835097ad00822a12013783df63f6b36cdfc7da50c2005'].includes(hash)) await adapter.write(file,skill);
            else kept.push(file);
          }
        }
        for (const root of ['.agents','.claude']) {
          const folder=root+'/skills/leetany-course';
          for (const [subdir, files] of [['scripts',scripts],['examples',LEETANY_NATIVE_EXAMPLES]]) {
            const dir=folder+'/'+subdir;
            if (!await adapter.exists(dir)) await adapter.mkdir(dir);
            for (const [name, content] of Object.entries(files)) {
              const file=dir+'/'+name;
              if (!await adapter.exists(file)) await adapter.write(file,content);
              else if (await adapter.read(file)!==content) kept.push(file);
            }
          }
        }
        const marker=hint.split(/\r?\n/)[0];
        for(const filename of ['AGENTS.md','CLAUDE.md']) {
          const file=this.app.vault.getAbstractFileByPath(filename);
          if(file) await this.app.vault.process(file,text=>
            text.split(/\r?\n/).includes(marker)?text:text+(text?'\n\n':'')+hint);
          else await this.app.vault.create(filename,hint);
        }
        new Notice(kept.length?'Kept customized files: '+kept.join(', '):'Course authoring skill installed');
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
