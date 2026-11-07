'use strict';
const {EditorState} = require('@codemirror/state');
const {EditorView, keymap, lineNumbers} = require('@codemirror/view');
const {defaultKeymap, history, historyKeymap, indentWithTab} = require('@codemirror/commands');
const {HighlightStyle, syntaxHighlighting, indentUnit, bracketMatching} = require('@codemirror/language');
const {tags, highlightTree} = require('@lezer/highlight');
const {python} = require('@codemirror/lang-python');
const {cpp} = require('@codemirror/lang-cpp');
const {rust} = require('@codemirror/lang-rust');
const {go} = require('@codemirror/lang-go');
const {languageNames} = require('./core');
const modes = {python, cpp, rust, go};

const highlight = HighlightStyle.define([
  {tag: tags.keyword, class: 'leetany-keyword'},
  {tag: [tags.function(tags.variableName), tags.typeName, tags.className], class: 'leetany-function'},
  {tag: tags.string, class: 'leetany-string'},
  {tag: [tags.number, tags.bool, tags.null, tags.special(tags.variableName)], class: 'leetany-literal'},
  {tag: tags.comment, class: 'leetany-comment'}
]);

function createCodeEditor(parent, language, doc, onChange) {
  return new EditorView({
    parent,
    doc,
    extensions: [
      modes[language](), syntaxHighlighting(highlight), lineNumbers(), bracketMatching(),
      history(), keymap.of([indentWithTab, ...historyKeymap, ...defaultKeymap]),
      EditorState.tabSize.of(4), indentUnit.of('    '),
      EditorView.contentAttributes.of({'aria-label': languageNames[language]+' code', spellcheck: 'false'}),
      EditorView.updateListener.of(update => {
        if (update.docChanged) onChange(update.state.doc.toString());
      })
    ]
  });
}

function renderExample(parent, language, source) {
  let end = 0;
  highlightTree(modes[language]().language.parser.parse(source), highlight, (from,to,classes) => {
    parent.append(source.slice(end,from));
    parent.createSpan({cls:classes,text:source.slice(from,to)});
    end = to;
  });
  parent.append(source.slice(end));
}

module.exports = {createCodeEditor, renderExample};
