'use strict';
const {setIcon, TFile} = require('obsidian');
const {renderPythonExample} = require('./editor');

const levels = {easy:'Easy', medium:'Medium', hard:'Hard'};

function showDescription(panel, view, task, tasks) {
  const bar = panel.createDiv({cls:'leetany-panel-bar'});
  const problem = panel.createDiv({cls:'leetany-problem'});
  const answer = panel.createDiv({cls:'leetany-problem leetany-answer'});
  const tabs = [];
  function addTab(label, icon, page) {
    const button = bar.createEl('button',{cls:'leetany-tab'});
    setIcon(button.createSpan(),icon);
    button.createSpan({text:label});
    tabs.push({button,page});
    button.onclick = () => {
      for (const tab of tabs) {
        tab.page.hidden = tab.page !== page;
        tab.button.setAttribute('aria-pressed',String(tab.page === page));
      }
    };
  }
  addTab('Description','file-text',problem);
  const editorial = task.editorial;
  if (editorial?.code) {
    addTab('Solution','book-open',answer);
    answer.createEl('h2',{text:'Solution'});
    if (editorial.explanation) answer.createEl('p',{cls:'leetany-statement',text:editorial.explanation});
    renderPythonExample(answer.createEl('pre',{cls:'leetany-reference'}).createEl('code'),editorial.code);
  }
  answer.hidden = true;
  for (const {button,page} of tabs) button.setAttribute('aria-pressed',String(page === problem));

  if (tasks.length > 1) {
    const select = bar.createEl('select',{attr:{'aria-label':'Exercise'}});
    tasks.forEach((e,i)=>{ select.createEl('option',{text:e.title}).value=String(i); });
    select.value=String(view.index);
    select.onchange=()=>{view.index=Number(select.value);view.draw();};
  }
  problem.createEl('h2',{text:task.title});
  const meta = problem.createDiv({cls:'leetany-meta'});
  if (Object.hasOwn(levels,task.difficulty)) {
    const badge=meta.createSpan({cls:'leetany-level',text:levels[task.difficulty]});
    badge.dataset.level=task.difficulty;
    badge.setAttribute('aria-label','Difficulty: '+levels[task.difficulty]);
  }
  if (typeof task.lesson === 'string' && task.lesson.trim() && view.file) {
    const vault=view.app.vault;
    const sibling=[view.file.parent?.path,task.lesson].filter(x=>x && x!=='/').join('/');
    const lesson=vault.getAbstractFileByPath(sibling) ?? vault.getAbstractFileByPath(task.lesson);
    if (lesson instanceof TFile && lesson.extension==='md') {
      const link=meta.createEl('button',{cls:'leetany-lesson',attr:{title:'Open lesson'}});
      setIcon(link.createSpan(),'book-open');
      link.createSpan({text:lesson.basename});
      link.onclick=()=>view.app.workspace.getLeaf('tab').openFile(lesson);
    }
  }
  problem.createEl('p',{cls:'leetany-statement',text:task.statement});
  if (task.example) {
    problem.createEl('h3',{text:'Example'});
    problem.createEl('pre',{cls:'leetany-example',text:task.example});
  }
}
module.exports={showDescription};
