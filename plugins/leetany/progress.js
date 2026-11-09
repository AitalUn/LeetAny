'use strict';
const {MarkdownRenderChild, parseYaml} = require('obsidian');
const {fingerprint, parseExerciseFile} = require('./core');

function config(source) {
  const value = parseYaml(source);
  if (!value || typeof value.folder !== 'string' || !value.folder.trim() ||
      !Array.isArray(value.axes) || !value.axes.length || value.axes.some(x => typeof x !== 'string' || !x.trim())) {
    throw Error('Set a course folder and a list of skill axes.');
  }
  return {...value, folder:value.folder.replace(/\/+$/, ''), axes:[...new Set(value.axes)]};
}

function link(parent, app, path, label, origin) {
  const anchor = parent.createEl('a', {text:label, cls:'internal-link', href:path});
  anchor.onclick = event => {
    event.preventDefault();
    app.workspace.openLinkText(path, origin, event.ctrlKey || event.metaKey);
  };
}

function radar(parent, axes) {
  const figure = parent.createEl('figure', {cls:'leetany-radar'});
  const svg = figure.createSvg('svg', {attr:{viewBox:'0 0 320 320', role:'img','aria-label':'Skill progress. Axis numbers correspond to the list.'}});
  function point(index, fraction) {
    const angle = 2 * Math.PI * index / axes.length - Math.PI / 2;
    return [160 + Math.cos(angle)*122*fraction, 160 + Math.sin(angle)*122*fraction];
  }
  function polygon(fraction, cls) {
    svg.createSvg('polygon',{cls,attr:{points:axes.map((a,i)=>point(i,fraction(a)).join(',')).join(' ')}});
  }
  for (const scale of [0.25,0.5,0.75,1]) polygon(()=>scale,'leetany-radar-guide');
  polygon(axis=>axis.total ? axis.done/axis.total : 0,'leetany-radar-area');
  axes.forEach((axis,i)=>{
    const [x,y]=point(i,1);
    svg.createSvg('line',{cls:'leetany-radar-guide',attr:{x1:160,y1:160,x2:x,y2:y}});
    const [lx,ly]=point(i,1.13);
    svg.createSvg('text',{attr:{x:lx,y:ly,'text-anchor':'middle','dominant-baseline':'central'}}).textContent=String(i+1);
    const [cx,cy]=point(i,axis.total ? axis.done/axis.total : 1);
    svg.createSvg('circle',{cls:axis.total?'leetany-radar-point':'leetany-radar-missing',attr:{cx,cy,r:3}});
  });
}

function readRequirements(text) {
  // Read only the delimited, user-editable Markdown table with six columns.
  const section = text.split('<!-- leetany:requirements -->')[1]?.split('<!-- /leetany:requirements -->')[0] || '';
  return section.split('\n').filter(line=>line.startsWith('|')).slice(2).map(line=>{
    const cols=line.slice(1,-1).split('|').map(x=>x.trim());
    if(cols.length!==6) throw Error('Expected six columns in the vacancy table.');
    const [role,source,kind,requirement,course,evidence]=cols;
    if(!['обязательно','желательно','опыт','опыт+'].includes(kind)) throw Error('Unknown requirement type: '+kind);
    return {role,source,kind,requirement,course,evidence};
  });
}

async function snapshot(app, cfg) {
  const files = app.vault.getFiles().filter(f=>f.path.startsWith(cfg.folder+'/'));
  const tasks = new Map(), chapters = new Map(), errors = [];
  const notes=files.filter(f=>f.extension==='md' && f.basename.startsWith('00 ') && f.parent.path!==cfg.folder);
  const resolve = (target, origin) => app.metadataCache.getFirstLinkpathDest(target, origin);
  for(const file of notes) {
    const text=await app.vault.cachedRead(file);
    for(const match of text.matchAll(/^\s*- \[([ xX])\]\s+\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/gm)){
      const chapter=resolve(match[2],file.path);
      if(chapter?.extension==='md') chapters.set(chapter.path,{read:match[1]!==' ',files:[]});
    }
  }
  for(const file of files.filter(f=>f.extension==='leetany').sort((a,b)=>a.path.localeCompare(b.path))) {
    try{
      for(const e of parseExerciseFile(await app.vault.cachedRead(file)).exercises){
        if(tasks.has(e.id)){ errors.push('Duplicate ID: '+e.id+' · '+file.path); continue; }
        const t={id:e.id,title:e.title,path:file.path,skills:Array.isArray(e.skills)?e.skills:[],done:e.passedHash===fingerprint(e)};
        tasks.set(t.id,t);
        if(e.lesson) chapters.get(resolve(e.lesson,file.path)?.path)?.files.push(t);
      }
    }catch(error){errors.push(file.path+' · '+error.message);}
  }
  const axes=cfg.axes.map(name=>{
    const tagged=[...tasks.values()].filter(t=>t.skills.includes(name));
    return {name,total:tagged.length,done:tagged.filter(t=>t.done).length};
  });
  const registry=cfg.vacancies && app.vault.getAbstractFileByPath(cfg.vacancies);
  if(cfg.vacancies && !registry) errors.push('Vacancy note not found: '+cfg.vacancies);
  const requirements=registry ? readRequirements(await app.vault.cachedRead(registry)) : [];
  return {tasks,chapters,axes,requirements,errors};
}

function evidenceFor(row,tasks,app,origin) {
  const refs=[],ids=[];
  for(const match of row.evidence.matchAll(/\[\[([^\]]+)\]\]|\x60([^\x60]+)\x60/g)){
    if(match[1]){
      const [note,heading]=match[1].split('#');
      const file=app.metadataCache.getFirstLinkpathDest(note,origin);
      const exists=file && (!heading || app.metadataCache.getFileCache(file)?.headings?.some(h=>h.heading===heading));
      if(exists) refs.push({path:match[1],label:file.basename});
    } else ids.push(match[2]);
  }
  const allowTasks=!row.kind.startsWith('опыт');
  const examples=allowTasks ? ids.map(id=>tasks.get(id)) : [];
  return {confirmed:refs.length>0 || (examples.length>0 && examples.every(t=>t?.done)),
    links:refs.concat(examples.filter(Boolean).map(t=>({path:t.path,label:(t.done?'✓ ':'○ ')+t.title})))};
}

class ProgressView extends MarkdownRenderChild {
  constructor(el,app,cfg,origin){super(el);Object.assign(this,{app,cfg,origin,version:0});}
  onload(){
    const refresh=()=>{
      const version=++this.version;
      clearTimeout(this.timer);
      this.timer=setTimeout(()=>this.refresh(version),80);
    };
    for(const ev of ['create','modify','delete','rename']){
      this.registerEvent(this.app.vault.on(ev,(file,old)=>{
        const relevant=p=>p && (p===this.cfg.vacancies || p.startsWith(this.cfg.folder+'/') || p===this.cfg.folder);
        if(relevant(file.path)||relevant(old)||file.extension==='md') refresh();
      }));
    }
    this.registerEvent(this.app.metadataCache.on('resolved',refresh));
    this.register(()=>{this.version++; clearTimeout(this.timer);});
    refresh();
  }
  async refresh(version){
    try{
      const s=await snapshot(this.app,this.cfg);
      if(version!==this.version)return;
      const el=this.containerEl; el.empty(); el.addClass('leetany-progress');
      const tasks=[...s.tasks.values()],chapters=[...s.chapters.values()];
      const trios=chapters.filter(c=>c.files.length===3);
      el.createEl('p',{text:'Read: '+chapters.filter(c=>c.read).length+'/'+chapters.length+' · Exercises passed: '+tasks.filter(t=>t.done).length+'/'+tasks.length+' · Chapters at 3/3: '+trios.filter(c=>c.files.every(t=>t.done)).length+'/'+trios.length});
      const layout=el.createDiv({cls:'leetany-radar-layout'}); radar(layout,s.axes);
      const list=layout.createEl('ol');
      for(const a of s.axes)list.createEl('li',{text:a.name+' · '+(a.total?a.done+'/'+a.total:'No data')});
      if(s.requirements.length)this.vacancies(el,s);
      if(s.errors.length)el.createEl('p',{text:s.errors.join('\n')});
    }catch(error){if(version===this.version)this.containerEl.setText(error.message);}
  }
  vacancies(el,s){
    const selector=el.createEl('select',{attr:{'aria-label':'Vacancy'}});
    const roles=[...new Set(s.requirements.map(r=>r.role))];
    for(const role of roles)selector.createEl('option',{text:role,value:role});
    selector.value=roles.includes(this.role)?this.role:roles[0];
    const body=el.createDiv();
    const show=()=>{
      this.role=selector.value;body.empty();
      const rows=s.requirements.filter(r=>r.role===this.role);
      const url=rows[0].source.match(/\((https?:\/\/[^)]+)\)/)?.[1];
      if(url)body.createEl('a',{text:'Vacancy posting',href:url});
      for(const optional of [false,true]){
        const group=rows.filter(r=>['желательно','опыт+'].includes(r.kind)===optional)
          .map(row=>({row,...evidenceFor(row,s.tasks,this.app,this.cfg.vacancies)}));
        body.createEl('h4',{text:(optional?'Preferred':'Required')+' · '+group.filter(r=>r.confirmed).length+'/'+group.length});
        const list=body.createEl('ul');
        for(const r of group){
          const li=list.createEl('li',{text:(r.confirmed?'Confirmed':'Unverified')+' · '+r.row.requirement});
          for(const item of r.links){li.appendText(' · ');link(li,this.app,item.path,item.label,this.origin);}
        }
      }
    };
    selector.onchange=show;show();
  }
}
function registerProgress(plugin){
  plugin.registerMarkdownCodeBlockProcessor('leetany-progress',(source,el,ctx)=>{
    try{ctx.addChild(new ProgressView(el,plugin.app,config(source),ctx.sourcePath));}
    catch(error){el.setText(error.message);}
  });
}
module.exports={registerProgress};
