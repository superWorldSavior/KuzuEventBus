// Mock for monaco-editor in tests
export const languages = {
  register: () => {},
  setMonarchTokensProvider: () => {},
  registerCompletionItemProvider: () => {},
  getLanguages: () => [],
  CompletionItemKind: {
    Keyword: 0,
    Function: 1,
    Class: 2,
    Reference: 3,
    Property: 4,
  },
  CompletionItemInsertTextRule: {
    InsertAsSnippet: 1,
  },
};

export const editor = {
  defineTheme: () => {},
};

export const KeyMod = {
  CtrlCmd: 1,
};

export const KeyCode = {
  Enter: 3,
};

export default {
  languages,
  editor,
  KeyMod,
  KeyCode,
};
