import { describe, expect, it } from "bun:test";

import { LRLanguage } from "@codemirror/language";
import { EditorSelection, EditorState } from "@codemirror/state";
import type { LRParser } from "@lezer/lr";
import { parser as mdParser } from "@lezer/markdown";

import { handleCodeBlockSelect } from "../src/feature/codeBlockSelect";

// MarkdownParser implements Parser interface, cast to LRParser for test language definition
const mdLanguage = LRLanguage.define({
  parser: mdParser as unknown as LRParser,
});

function createMockView(docText: string, cursorOrSelection: number | [number, number]) {
  const selection =
    typeof cursorOrSelection === "number"
      ? EditorSelection.cursor(cursorOrSelection)
      : EditorSelection.single(cursorOrSelection[0], cursorOrSelection[1]);

  let state = EditorState.create({
    doc: docText,
    selection,
    extensions: [mdLanguage],
  });

  return {
    get state() {
      return state;
    },
    dispatch(tr: { selection: EditorSelection }) {
      state = state.update(tr).state;
    },
  };
}

describe("codeBlockSelect", () => {
  it("selects code block content on first press, full block on second, and falls through on third", () => {
    const doc = "Intro\n```ts\nconst x = 1;\nconsole.log(x);\n```\nOutro";
    // Place cursor at 'x' in 'const x = 1;'
    const cursor = doc.indexOf("const x");
    const view = createMockView(doc, cursor);

    // 1st press: selects only code content
    const firstHandled = handleCodeBlockSelect(view, () => true);
    expect(firstHandled).toBe(true);
    expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe(
      "const x = 1;\nconsole.log(x);",
    );

    // 2nd press: selects the entire fenced block
    const secondHandled = handleCodeBlockSelect(view, () => true);
    expect(secondHandled).toBe(true);
    expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe(
      "```ts\nconst x = 1;\nconsole.log(x);\n```",
    );

    // 3rd press: returns false so default selectAll can take over
    const thirdHandled = handleCodeBlockSelect(view, () => true);
    expect(thirdHandled).toBe(false);
  });

  it("handles cursor on opening fence line", () => {
    const doc = "```ts\nconst a = 10;\n```";
    // Cursor at index 1 (on ```ts)
    const view = createMockView(doc, 1);

    const handled = handleCodeBlockSelect(view, () => true);
    expect(handled).toBe(true);
    expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe(
      "const a = 10;",
    );
  });

  it("handles cursor on closing fence line", () => {
    const doc = "```ts\nconst a = 10;\n```";
    // Cursor at the last character of closing ```
    const view = createMockView(doc, doc.length);

    const handled = handleCodeBlockSelect(view, () => true);
    expect(handled).toBe(true);
    expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe(
      "const a = 10;",
    );
  });

  it("returns false when cursor is outside code block", () => {
    const doc = "Hello world\n```js\nconst x = 1;\n```";
    const view = createMockView(doc, 3);

    const handled = handleCodeBlockSelect(view, () => true);
    expect(handled).toBe(false);
  });

  it("returns false when disabled in settings", () => {
    const doc = "```js\nconst x = 1;\n```";
    const view = createMockView(doc, 8);

    const handled = handleCodeBlockSelect(view, () => false);
    expect(handled).toBe(false);
  });

  it("handles empty code block", () => {
    const doc = "```js\n```";
    const view = createMockView(doc, 2);

    // 1st press selects whole empty block
    const firstHandled = handleCodeBlockSelect(view, () => true);
    expect(firstHandled).toBe(true);
    expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe(
      "```js\n```",
    );

    // 2nd press falls through
    const secondHandled = handleCodeBlockSelect(view, () => true);
    expect(secondHandled).toBe(false);
  });

  it("handles unclosed code block", () => {
    const doc = "```js\nconst unclosed = true;";
    const view = createMockView(doc, 10);

    const handled = handleCodeBlockSelect(view, () => true);
    expect(handled).toBe(true);
    expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe(
      "const unclosed = true;",
    );
  });

  it("handles indented code block", () => {
    const doc = "    const indented = 1;\n    const second = 2;";
    const view = createMockView(doc, 10);

    const firstHandled = handleCodeBlockSelect(view, () => true);
    expect(firstHandled).toBe(true);

    const secondHandled = handleCodeBlockSelect(view, () => true);
    expect(secondHandled).toBe(false);
  });

  it("works without markdown language parser extension", () => {
    const doc = "Intro\n```ts\nconst x = 1;\n```\nOutro";
    let state = EditorState.create({
      doc,
      selection: EditorSelection.cursor(doc.indexOf("const x")),
    });
    const view = {
      get state() {
        return state;
      },
      dispatch(tr: { selection: EditorSelection }) {
        state = state.update(tr).state;
      },
    };

    const handled = handleCodeBlockSelect(view, () => true);
    expect(handled).toBe(true);
    expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe(
      "const x = 1;",
    );
  });

  it("handles tilde fenced code block", () => {
    const doc = "~~~python\nprint('hello')\n~~~";
    const view = createMockView(doc, 12);

    const handled = handleCodeBlockSelect(view, () => true);
    expect(handled).toBe(true);
    expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe(
      "print('hello')",
    );
  });

  it("handles nested fences with longer outer fence", () => {
    const doc = "````markdown\n```js\nconst a = 1;\n```\n````";
    const view = createMockView(doc, doc.indexOf("const a"));

    const handled = handleCodeBlockSelect(view, () => true);
    expect(handled).toBe(true);
    expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe(
      "```js\nconst a = 1;\n```",
    );
  });
});
