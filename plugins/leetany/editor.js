'use strict';
const {EditorState} = require('@codemirror/state');
const {EditorView, keymap, lineNumbers} = require('@codemirror/view');
const {defaultKeymap, history, historyKeymap, indentWithTab} = require('@codemirror/commands');
const {HighlightStyle, syntaxHighlighting, indentUnit, bracketMatching} = require('@codemirror/language');
const {tags, highlightTree} = require('@lezer/highlight');
const {python, pythonLanguage} = require('@codemirror/lang-python');

const highlight = HighlightStyle.define([
  {tag: tags.keyword, class: 'leetany-keyword'},
  {tag: [tags.function(tags.variableName), tags.typeName, tags.className], class: 'leetany-function'},
  {tag: tags.string, class: 'leetany-string'},
  {tag: [tags.number, tags.bool, tags.null, tags.special(tags.variableName)], class: 'leetany-literal'},
  {tag: tags.comment, class: 'leetany-comment'}
]);

function createPythonEditor(parent, doc, onChange) {
  return new EditorView({
    parent,
    doc,
    extensions: [
      python(), syntaxHighlighting(highlight), lineNumbers(), bracketMatching(),
      history(), keymap.of([indentWithTab, ...historyKeymap, ...defaultKeymap]),
      EditorState.tabSize.of(4), indentUnit.of('    '),
      EditorView.contentAttributes.of({'aria-label': 'Python code', spellcheck: 'false'}),
      EditorView.updateListener.of(update => {
        if (update.docChanged) onChange(update.state.doc.toString());
      })
    ]
  });
}

function renderPythonExample(parent, source) {
  let end = 0;
  highlightTree(pythonLanguage.parser.parse(source), highlight, (from,to,classes) => {
    parent.append(source.slice(end,from));
    parent.createSpan({cls:classes,text:source.slice(from,to)});
    end = to;
  });
  parent.append(source.slice(end));
}

module.exports = {createPythonEditor, renderPythonExample};
