'use strict';
const {pythonLanguage} = require('@codemirror/lang-python');
const {setIcon} = require('obsidian');

function positionalNames(task) {
  const names = [];
  pythonLanguage.parser.parse(task.starter).iterate({enter(node) {
    if (node.name !== 'FunctionDefinition') return;
    const def = node.node;
    const name = def.getChild('VariableName');
    if (!name || task.starter.slice(name.from, name.to) !== task.entry) return false;
    let atStart = true;
    for (let p = def.getChild('ParamList')?.firstChild; p; p = p.nextSibling) {
      if (p.name === '*' || p.name === '**') break;
      if (p.name === ',') atStart = true;
      else if (p.name !== '(' && atStart) {
        if (p.name === 'VariableName') names.push(task.starter.slice(p.from, p.to));
        atStart = false;
      }
    }
    return false;
  }});
  return names;
}

function valueText(value) {
  if (value === null) return 'None';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (Array.isArray(value)) return '[' + value.map(valueText).join(', ') + ']';
  if (typeof value === 'object') {
    return '{' + Object.entries(value).map(([k,v]) => JSON.stringify(k) + ': ' + valueText(v)).join(', ') + '}';
  }
  return JSON.stringify(value);
}

function field(parent, label, value, tone) {
  const block = parent.createDiv({cls:'leetany-field'});
  block.createDiv({cls:'leetany-field-label',text:label});
  block.createEl('pre',{text:value,cls:tone || ''});
}

class TestPanel {
  constructor(parent, task) {
    this.task = task;
    this.names = task.parameters ?? (task.language && task.language !== 'python' ? [] : positionalNames(task));
    this.format = task.language && task.language !== 'python' ? v=>JSON.stringify(v) : valueText;
    this.active = 'tests';
    this.index = 0;
    this.message = 'Run your code to see the results.';
    const panel = parent.createDiv({cls:'leetany-panel leetany-tests'});
    const tabs = panel.createDiv({cls:'leetany-panel-bar'});
    this.tabs = {};
    for (const [id, title, icon] of [['tests','Testcase','list-checks'], ['results','Test Result','terminal']]) {
      const button = tabs.createEl('button',{cls:'leetany-tab'});
      setIcon(button.createSpan({cls:'leetany-icon'}),icon);
      button.createSpan({text:title});
      button.onclick = () => { this.active = id; this.render(); };
      this.tabs[id] = button;
    }
    this.body = panel.createDiv({cls:'leetany-test-body'});
    this.summary = this.body.createDiv({cls:'leetany-summary',attr:{'aria-live':'polite'}});
    this.cases = this.body.createDiv({cls:'leetany-case-list',attr:{'aria-label':'Choose a test case'}});
    this.buttons = task.tests.map((_, index) => {
      const button = this.cases.createEl('button',{cls:'leetany-case',text:'Case '+(index+1)});
      button.onclick = () => { this.index = index; this.render(); };
      return button;
    });
    this.detail = this.body.createDiv();
    this.render();
  }

  begin() {
    this.report = null;
    this.active = 'results';
    this.message = 'Running…';
    this.render();
  }

  invalidate() {
    if (!this.report && this.message === 'Code changed. Run the tests again.') return;
    this.report = null;
    this.message = 'Code changed. Run the tests again.';
    this.render();
  }

  finish(report) {
    this.report = report;
    this.active = 'results';
    const firstFailure = report.cases?.findIndex(c => !c.passed) ?? -1;
    if (firstFailure >= 0) this.index = firstFailure;
    this.render();
    this.body.scrollTop = 0;
  }

  render() {
    const results = this.active === 'results';
    for (const [id, tab] of Object.entries(this.tabs)) tab.setAttribute('aria-pressed',String(id === this.active));
    const report = results ? this.report : null;
    const hasCases = Boolean(report?.cases?.length);
    this.cases.hidden = results && !hasCases;
    this.summary.hidden = !results;
    this.summary.empty();
    this.detail.empty();
    if (results) {
      if (!report) {
        this.summary.createDiv({cls:'leetany-empty',text:this.message});
        return;
      }
      const success = report.verdict === 'PASSED';
      const title = {PASSED:'Accepted', FAILED:'Tests failed', TIMEOUT:'Time Limit Exceeded', ERROR:'Execution Error', COMPILE_ERROR:'Compilation Error'}[report.verdict] || report.verdict;
      this.summary.createEl('strong',{cls: success ? 'leetany-pass' : 'leetany-fail',text:title});
      if (hasCases) this.summary.createSpan({text:report.passed+' of '+report.total+' passed'});
      if (report.message) field(this.detail,'Message',report.message);
      if (!hasCases) return;
    }

    this.buttons.forEach((button,i) => {
      button.setAttribute('aria-pressed',String(i === this.index));
      const outcome = report?.cases?.[i];
      const mark = outcome ? (outcome.passed ? '✓ ' : '✕ ') : '';
      button.setText(mark+'Case '+(i+1));
      button.dataset.outcome = outcome ? (outcome.passed ? 'pass' : 'fail') : '';
    });
    const test = this.task.tests[this.index];
    const actual = report?.cases?.[this.index];
    const expected = Object.hasOwn(test,'error') ? test.error : this.format(test.expected);
    if (actual) {
      const returned = actual.error ? [actual.error,actual.message].filter(Boolean).join(': ') : actual.actual;
      const comparison = this.detail.createDiv({cls:'leetany-comparison'});
      field(comparison,'Output',returned,actual.passed ? 'leetany-pass' : 'leetany-fail');
      field(comparison,'Expected',expected);
      if (actual.mutation) field(this.detail,'Error',actual.mutation,'leetany-fail');
    }
    if (!test.args.length) field(this.detail,'Arguments','()');
    test.args.forEach((arg,i) => field(this.detail,(this.names[i] || 'Argument '+(i+1))+' =',this.format(arg)));
    if (!actual) field(this.detail,'Expected',expected);
    if (report?.stdout) field(this.detail,'Program output',report.stdout);
  }
}

module.exports = {TestPanel};
