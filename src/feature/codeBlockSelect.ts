import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import { EditorSelection, type Extension, Prec } from "@codemirror/state";
import { type EditorView, keymap } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";

export interface CodeBlockRange {
  from: number;
  to: number;
  blockFrom: number;
  blockTo: number;
}

export function findCodeBlockNode(
  view: { state: EditorView["state"] },
  pos: number,
): SyntaxNode | null {
  const { state } = view;
  const tree = ensureSyntaxTree(state, pos, 50) ?? syntaxTree(state);

  for (const checkPos of [pos, Math.max(0, pos - 1)]) {
    let node: SyntaxNode | null = tree.resolveInner(checkPos, 1);
    while (node) {
      if (node.name === "FencedCode" || node.name === "CodeBlock") {
        return node;
      }
      node = node.parent;
    }
  }

  return null;
}

export function findFencedCodeBlockByLines(
  state: EditorView["state"],
  pos: number,
): CodeBlockRange | null {
  const { doc } = state;
  const targetLine = doc.lineAt(pos);
  const targetLineNum = targetLine.number;

  let inBlock = false;
  let fenceChar = "";
  let fenceLen = 0;
  let blockStartLine = 0;

  for (let i = 1; i <= targetLineNum; i++) {
    const line = doc.line(i);
    const text = line.text;

    if (!inBlock) {
      const match = text.match(/^(\s{0,3})(`{3,}|~{3,})(.*)$/);
      if (match) {
        const char = match[2][0];
        const len = match[2].length;
        const rest = match[3];
        if (char === "`" && rest.includes("`")) continue;
        inBlock = true;
        fenceChar = char;
        fenceLen = len;
        blockStartLine = i;
      }
    } else {
      const match = text.match(/^(\s{0,3})(`{3,}|~{3,})\s*$/);
      if (match && match[2][0] === fenceChar && match[2].length >= fenceLen) {
        if (i === targetLineNum) {
          return buildFencedRange(doc, blockStartLine, i, true);
        }
        inBlock = false;
      }
    }
  }

  if (!inBlock) return null;

  let blockEndLine = doc.lines;
  let hasClosingFence = false;
  for (let i = targetLineNum + 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const match = line.text.match(/^(\s{0,3})(`{3,}|~{3,})\s*$/);
    if (match && match[2][0] === fenceChar && match[2].length >= fenceLen) {
      blockEndLine = i;
      hasClosingFence = true;
      break;
    }
  }

  return buildFencedRange(doc, blockStartLine, blockEndLine, hasClosingFence);
}

function buildFencedRange(
  doc: EditorView["state"]["doc"],
  startLineNum: number,
  endLineNum: number,
  hasClosingFence: boolean,
): CodeBlockRange {
  const startLine = doc.line(startLineNum);
  const endLine = doc.line(endLineNum);
  const blockFrom = startLine.from;
  const blockTo = endLine.to;
  const contentStart = Math.min(doc.length, startLine.to + 1);
  const contentEnd =
    hasClosingFence && endLineNum > startLineNum
      ? Math.max(contentStart, doc.line(endLineNum - 1).to)
      : blockTo;

  return { from: contentStart, to: contentEnd, blockFrom, blockTo };
}

export function getCodeBlockRange(state: EditorView["state"], pos: number): CodeBlockRange | null {
  const fencedRange = findFencedCodeBlockByLines(state, pos);
  if (fencedRange) return fencedRange;

  const targetNode = findCodeBlockNode({ state }, pos);
  if (!targetNode) return null;

  const blockFrom = targetNode.from;
  const blockTo = targetNode.to;
  if (targetNode.name === "CodeBlock") {
    return { from: blockFrom, to: blockTo, blockFrom, blockTo };
  }

  const startLine = state.doc.lineAt(blockFrom);
  const contentStart = Math.min(state.doc.length, startLine.to + 1);
  const endCheckPos = Math.max(blockFrom, blockTo > blockFrom ? blockTo - 1 : blockFrom);
  const lastLine = state.doc.lineAt(endCheckPos);
  const isClosingFence =
    lastLine.number > startLine.number && /^\s*(`{3,}|~{3,})/.test(lastLine.text);
  const contentEnd = isClosingFence
    ? Math.max(contentStart, state.doc.line(lastLine.number - 1).to)
    : blockTo;

  return {
    from: contentStart,
    to: contentEnd,
    blockFrom,
    blockTo,
  };
}

export function handleCodeBlockSelect(
  view: {
    state: EditorView["state"];
    dispatch: (tr: { selection: EditorSelection }) => void;
  },
  isEnabled: () => boolean,
): boolean {
  if (!isEnabled()) return false;

  const { state } = view;
  const { main } = state.selection;
  const range = getCodeBlockRange(state, main.head);

  if (!range) return false;

  const { from, to, blockFrom, blockTo } = range;

  if (main.from === blockFrom && main.to === blockTo) {
    return false;
  }

  if (from < to && (main.from !== from || main.to !== to)) {
    view.dispatch({
      selection: EditorSelection.single(from, to),
    });
    return true;
  }

  view.dispatch({
    selection: EditorSelection.single(blockFrom, blockTo),
  });
  return true;
}
export function createCodeBlockSelectExtension(isEnabled: () => boolean): Extension {
  return Prec.highest(
    keymap.of([
      {
        key: "Mod-a",
        run: (view: EditorView) => handleCodeBlockSelect(view, isEnabled),
      },
    ]),
  );
}
