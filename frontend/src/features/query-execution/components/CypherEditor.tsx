import { useRef, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import { cn } from "@/shared/lib";

interface CypherEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  height?: string | number;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  databaseSchema?: {
    nodeTypes: string[];
    relationshipTypes: string[];
    properties: Record<string, string[]>;
  };
}

export function CypherEditor({
  value,
  onChange,
  onExecute,
  height = "300px",
  readOnly = false,
  className,
  placeholder = "// Enter your Cypher query here\n// Example: MATCH (n) RETURN n LIMIT 10",
  databaseSchema,
}: CypherEditorProps) {
  const editorRef = useRef<any>(null);

  // Configure Monaco editor for Cypher
  useEffect(() => {
    const setupCypherLanguage = async () => {
      const monaco = await import("monaco-editor");
      
      // Register Cypher language if not already registered
      if (!monaco.languages.getLanguages().find((lang: any) => lang.id === 'cypher')) {
        monaco.languages.register({ id: 'cypher' });

        // Define Cypher syntax highlighting
        monaco.languages.setMonarchTokensProvider('cypher', {
          tokenizer: {
            root: [
              // Keywords
              [/\b(MATCH|RETURN|WHERE|CREATE|MERGE|DELETE|SET|REMOVE|WITH|UNWIND|FOREACH|CALL|YIELD|UNION|ALL|DISTINCT|ORDER|BY|SKIP|LIMIT|ASC|DESC|AND|OR|NOT|XOR|IN|STARTS|ENDS|CONTAINS|IS|NULL|TRUE|FALSE|CASE|WHEN|THEN|ELSE|END)\b/i, 'keyword'],
              
              // Functions
              [/\b(count|sum|avg|min|max|collect|size|length|type|id|labels|nodes|relationships|properties|keys|values|head|tail|last|extract|filter|reduce|any|all|none|single|exists|abs|ceil|floor|round|sign|sqrt|log|log10|exp|sin|cos|tan|asin|acos|atan|degrees|radians|pi|e|rand|range|timestamp|date|time|datetime|duration|localdatetime|localtime|point|distance|toString|toInteger|toFloat|toBoolean|trim|ltrim|rtrim|upper|lower|substring|left|right|replace|split|reverse|apoc)\b/i, 'function'],
              
              // Operators
              [/[=<>!]+|[+\-*\/]|%|\^/, 'operator'],
              
              // Numbers
              [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
              [/\d+/, 'number'],
              
              // Strings
              [/"([^"\\]|\\.)*$/, 'string.invalid'],
              [/"/, 'string', '@string_double'],
              [/'([^'\\]|\\.)*$/, 'string.invalid'],
              [/'/, 'string', '@string_single'],
              
              // Comments
              [/\/\/.*$/, 'comment'],
              [/\/\*/, 'comment', '@comment'],
              
              // Variables and identifiers
              [/\$[a-zA-Z_]\w*/, 'variable'],
              [/[a-zA-Z_]\w*/, 'identifier'],
              
              // Delimiters
              [/[{}()\[\]]/, '@brackets'],
              [/[<>]/, 'delimiter.angle'],
              [/[,;.]/, 'delimiter'],
            ],
            
            string_double: [
              [/[^\\"]+/, 'string'],
              [/\\./, 'string.escape'],
              [/"/, 'string', '@pop']
            ],
            
            string_single: [
              [/[^\\']+/, 'string'],
              [/\\./, 'string.escape'],
              [/'/, 'string', '@pop']
            ],
            
            comment: [
              [/[^\/*]+/, 'comment'],
              [/\*\//, 'comment', '@pop'],
              [/[\/*]/, 'comment']
            ]
          }
        });

        // Configure completion provider
        monaco.languages.registerCompletionItemProvider('cypher', {
          provideCompletionItems: (model: any, position: any) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn
            };

            const suggestions = [
              // Keywords
              ...['MATCH', 'RETURN', 'WHERE', 'CREATE', 'MERGE', 'DELETE', 'SET', 'REMOVE', 'WITH', 'UNWIND', 'ORDER BY', 'LIMIT', 'SKIP'].map(keyword => ({
                label: keyword,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: keyword,
                range
              })),
              
              // Functions
              ...['count()', 'sum()', 'avg()', 'min()', 'max()', 'collect()', 'size()', 'length()', 'type()', 'id()', 'labels()'].map(func => ({
                label: func,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: func.replace('()', '($1)'),
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range
              })),
            ];

            // Add schema-based suggestions if available
            if (databaseSchema) {
              // Node types
              suggestions.push(...databaseSchema.nodeTypes.map(nodeType => ({
                label: `:${nodeType}`,
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: `:${nodeType}`,
                documentation: `Node type: ${nodeType}`,
                range
              })));

              // Relationship types
              suggestions.push(...databaseSchema.relationshipTypes.map(relType => ({
                label: `:${relType}`,
                kind: monaco.languages.CompletionItemKind.Reference,
                insertText: `:${relType}`,
                documentation: `Relationship type: ${relType}`,
                range
              })));

              // Properties
              Object.entries(databaseSchema.properties).forEach(([nodeType, props]) => {
                suggestions.push(...props.map(prop => ({
                  label: prop,
                  kind: monaco.languages.CompletionItemKind.Property,
                  insertText: prop,
                  documentation: `Property of ${nodeType}`,
                  range
                })));
              });
            }

            return { suggestions };
          }
        });

        // Define theme
        monaco.editor.defineTheme('cypher-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [
            { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
            { token: 'function', foreground: 'dcdcaa' },
            { token: 'variable', foreground: '9cdcfe' },
            { token: 'string', foreground: 'ce9178' },
            { token: 'number', foreground: 'b5cea8' },
            { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
            { token: 'operator', foreground: 'd4d4d4' },
          ],
          colors: {
            'editor.background': '#1e1e1e',
          }
        });

        monaco.editor.defineTheme('cypher-light', {
          base: 'vs',
          inherit: true,
          rules: [
            { token: 'keyword', foreground: '0000ff', fontStyle: 'bold' },
            { token: 'function', foreground: '795e26' },
            { token: 'variable', foreground: '001080' },
            { token: 'string', foreground: 'a31515' },
            { token: 'number', foreground: '098658' },
            { token: 'comment', foreground: '008000', fontStyle: 'italic' },
            { token: 'operator', foreground: '000000' },
          ],
          colors: {
            'editor.background': '#ffffff',
          }
        });
      }
    };

    setupCypherLanguage();
  }, [databaseSchema]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onExecute?.();
    });

    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      glyphMargin: false,
      folding: true,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 3,
      renderLineHighlight: 'line',
      selectOnLineNumbers: true,
      automaticLayout: true,
    });
  };

  const handleChange = (newValue: string | undefined) => {
    onChange(newValue || '');
  };

  // Determine theme based on system preference
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = isDarkMode ? 'cypher-dark' : 'cypher-light';

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <Editor
        height={height}
        language="cypher"
        value={value || placeholder}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme={theme}
        options={{
          readOnly,
          fontSize: 14,
          fontFamily: "'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
          lineHeight: 1.5,
          padding: { top: 12, bottom: 12 },
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
          parameterHints: {
            enabled: true,
          },
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'mouseover',
          bracketPairColorization: {
            enabled: true,
          },
        }}
      />
      
      {/* Editor footer with shortcuts info */}
      <div className="px-3 py-2 bg-muted/50 border-t text-xs text-muted-foreground flex items-center justify-between">
        <span>Cypher Query Editor</span>
        <span>Press Ctrl+Enter to execute</span>
      </div>
    </div>
  );
}

export default CypherEditor;