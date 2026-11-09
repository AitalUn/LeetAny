'use strict';
const {MarkdownRenderChild, parseYaml} = require('obsidian');
const {fingerprint, parseExerciseFile} = require('./core');

function config(source) {
  const value = parseYaml(source);
  if (!value || typeof value.folder !== 'string' || !value.folder.trim() ||
      !Array.isArray(value.axes) || !value.axes.length || value.axes.some(x => typeof x !== 'string' || !x.trim())) {
    throw Error('Set a course folder and a list of skill axes.');
  }
  const courseAxes=value.courseAxes ?? {};
  if (typeof courseAxes!=='object' || Array.isArray(courseAxes) || Object.values(courseAxes).some(names=>!Array.isArray(names) || names.some(n=>typeof n!=='string' || !n.trim()))){
    throw Error('courseAxes must map course folder names to lists of skills.');
  }
  return {...value, courseAxes, folder:value.folder.replace(/\/+$/, ''), axes:[...new Set(value.axes)]};
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
  // One or two skills cannot enclose a polygon. Draw independent spokes against rings.
  for (const scale of [0.25,0.5,0.75,1]) {
    if(axes.length>=3) polygon(()=>scale,'leetany-radar-guide');
    else svg.createSvg('circle',{cls:'leetany-radar-guide',attr:{cx:160,cy:160,r:122*scale}});
  }
  if(axes.length>=3) polygon(axis=>axis.total ? axis.done/axis.total : 0,'leetany-radar-area');
  axes.forEach((axis,i)=>{
    const [x,y]=point(i,1);
    svg.createSvg('line',{cls:'leetany-radar-guide',attr:{x1:160,y1:160,x2:x,y2:y}});
    const [lx,ly]=point(i,1.13);
    svg.createSvg('text',{attr:{x:lx,y:ly,'text-anchor':'middle','dominant-baseline':'central'}}).textContent=String(i+1);
    const [cx,cy]=point(i,axis.total ? axis.done/axis.total : 1);
    if(axes.length<3 && axis.done) svg.createSvg('line',{cls:'leetany-radar-spoke',attr:{x1:160,y1:160,x2:cx,y2:cy}});
    svg.createSvg('circle',{cls:axis.total?'leetany-radar-point':'leetany-radar-missing',attr:{cx,cy,r:3}});
  });
}

function readRequirements(text) {
  // Read only the delimited, user-editable Markdown table with optional skill labels.
  const section = text.split('<!-- leetany:requirements -->')[1]?.split('<!-- /leetany:requirements -->')[0] || '';
  return section.split('\n').filter(line=>line.startsWith('|')).slice(2).map(line=>{
    const cols=line.slice(1,-1).split('|').map(x=>x.trim());
    if(cols.length!==6 && cols.length!==7) throw Error('Expected six or seven columns in the vacancy table.');
    const [role,source,kind,requirement,course,evidence,labels='']=cols;
    if(!['обязательно','желательно','опыт','опыт+'].includes(kind)) throw Error('Unknown requirement type: '+kind);
    return {role,source,kind,requirement,course,evidence,skills:[...new Set(labels.split(',').map(x=>x.trim()).filter(x=>x && x!=='—'))]};
  });
}

async function snapshot(app, cfg) {
  const files = app.vault.getFiles().filter(f=>f.path.startsWith(cfg.folder+'/'));
  const tasks = new Map(), chapters = new Map(), errors = [];
  const courseFor=path=>path.slice(cfg.folder.length+1).split('/').slice(0,-1)[0] || '';
  const courses=new Set();
  const notes=files.filter(f=>f.extension==='md' && f.basename.startsWith('00 ') && f.parent.path!==cfg.folder);
  const resolve = (target, origin) => app.metadataCache.getFirstLinkpathDest(target, origin);
  for(const file of notes) {
    courses.add(courseFor(file.path));
    const text=await app.vault.cachedRead(file);
    for(const match of text.matchAll(/^\s*- \[([ xX])\]\s+\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/gm)){
      const chapter=resolve(match[2],file.path);
      if(chapter?.extension==='md') chapters.set(chapter.path,{course:courseFor(file.path),read:match[1]!==' ',files:[]});
    }
  }
  for(const file of files.filter(f=>f.extension==='leetany').sort((a,b)=>a.path.localeCompare(b.path))) {
    try{
      for(const e of parseExerciseFile(await app.vault.cachedRead(file)).exercises){
        if(tasks.has(e.id)){ errors.push('Duplicate ID: '+e.id+' · '+file.path); continue; }
        const t={id:e.id,title:e.title,path:file.path,course:courseFor(file.path),skills:Array.isArray(e.skills)?e.skills:[],done:e.passedHash===fingerprint(e)};
        tasks.set(t.id,t); if(t.course) courses.add(t.course);
        if(e.lesson) chapters.get(resolve(e.lesson,file.path)?.path)?.files.push(t);
      }
    }catch(error){errors.push(file.path+' · '+error.message);}
  }
  const registry=cfg.vacancies && app.vault.getAbstractFileByPath(cfg.vacancies);
  if(cfg.vacancies && !registry) errors.push('Vacancy note not found: '+cfg.vacancies);
  const requirements=registry ? readRequirements(await app.vault.cachedRead(registry)) : [];
  return {tasks,chapters,courses:[...courses].sort(),requirements,errors};
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

function exerciseAxes(tasks,names){
  return [...new Set(names)].map(name=>{
    const tagged=tasks.filter(t=>t.skills.includes(name));
    return {name,total:tagged.length,done:tagged.filter(t=>t.done).length};
  });
}

function requirementAxes(rows){
  return [...new Set(rows.flatMap(r=>r.skills))].map(name=>{
    const tagged=rows.filter(r=>r.skills.includes(name));
    return {name,total:tagged.length,done:tagged.filter(r=>r.confirmed).length};
  });
}

function drawChart(el,axes){
  if(!axes.length)return;
  const layout=el.createDiv({cls:'leetany-radar-layout'}); radar(layout,axes);
  const list=layout.createEl('ol');
  for(const a of axes)list.createEl('li',{text:a.name+' · '+(a.total?a.done+'/'+a.total:'No data')});
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
      const selector=el.createEl('select',{attr:{'aria-label':'Progress view'}});
      selector.createEl('option',{text:'All courses',value:'all'});
      const roles=[...new Set(s.requirements.map(r=>r.role))];
      for(const [label,prefix,names] of [['Courses','course:',s.courses],['Vacancies','vacancy:',roles]]) {
        if(!names.length)continue;
        const group=selector.createEl('optgroup',{attr:{label}});
        for(const name of names)group.createEl('option',{text:name,value:prefix+name});
      }
      selector.value=Array.from(selector.options).some(o=>o.value===this.scope)?this.scope:'all';
      const body=el.createDiv();
      const show=()=>{
        this.scope=selector.value; body.empty();
        if(this.scope.startsWith('vacancy:'))this.vacancy(body,s,this.scope.slice(8));
        else this.course(body,s,this.scope==='all'?null:this.scope.slice(7));
      };
      selector.onchange=show;show();
      if(s.errors.length)el.createEl('p',{text:s.errors.join('\n')});
    }catch(error){if(version===this.version)this.containerEl.setText(error.message);}
  }
  course(body,s,name){
    const inCourse=item=>!name || item.course===name;
    const tasks=[...s.tasks.values()].filter(inCourse),chapters=[...s.chapters.values()].filter(inCourse);
    const trios=chapters.filter(c=>c.files.length===3);
    body.createEl('p',{text:'Read: '+chapters.filter(c=>c.read).length+'/'+chapters.length+' · Exercises passed: '+tasks.filter(t=>t.done).length+'/'+tasks.length+' · Chapters at 3/3: '+trios.filter(c=>c.files.every(t=>t.done)).length+'/'+trios.length});
    const names=name?[...(this.cfg.courseAxes[name]||[]),...tasks.flatMap(t=>t.skills)]:this.cfg.axes;
    drawChart(body,exerciseAxes(tasks,names));
    if(!names.length)body.createEl('p',{text:'No skill axes yet. Tag exercises or set courseAxes for this course.'});
  }
  vacancy(body,s,role){
      const rows=s.requirements.filter(r=>r.role===role).map(row=>({...row,...evidenceFor(row,s.tasks,this.app,this.cfg.vacancies)}));
      const axes=requirementAxes(rows);
      if(axes.length){
        body.createEl('p',{text:'Confirmed requirements per skill (required and preferred).'});
        drawChart(body,axes);
      }else body.createEl('p',{text:'Add skill names to the seventh column of the vacancy table to chart this role.'});
      const url=rows[0].source.match(/\((https?:\/\/[^)]+)\)/)?.[1];
      if(url)body.createEl('a',{text:'Vacancy posting',href:url});
      for(const optional of [false,true]){
        const group=rows.filter(r=>['желательно','опыт+'].includes(r.kind)===optional);
        body.createEl('h4',{text:(optional?'Preferred':'Required')+' · '+group.filter(r=>r.confirmed).length+'/'+group.length});
        const list=body.createEl('ul');
        for(const r of group){
          const li=list.createEl('li',{text:(r.confirmed?'Confirmed':'Unverified')+' · '+r.requirement});
          for(const item of r.links){li.appendText(' · ');link(li,this.app,item.path,item.label,this.origin);}
        }
      }
  }
}
function registerProgress(plugin){
  plugin.registerMarkdownCodeBlockProcessor('leetany-progress',(source,el,ctx)=>{
    try{ctx.addChild(new ProgressView(el,plugin.app,config(source),ctx.sourcePath));}
    catch(error){el.setText(error.message);}
  });
}
module.exports={registerProgress};
