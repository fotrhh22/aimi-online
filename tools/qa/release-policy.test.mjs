import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
const files = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(d + "/" + e.name)
      : e.name.endsWith(".tsx")
        ? [d + "/" + e.name]
        : [],
  );
test("all two-action dialogs put an enabled close action before the transaction", () => {
  let pairs = 0;
  for (const file of files("apps/miniapp/src")) {
    const tree = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const attr = (n, key) =>
      n.openingElement.attributes.properties.find(
        (a) => ts.isJsxAttribute(a) && a.name.getText(tree) === key,
      );
    function visit(n, modal = false) {
      const el = ts.isJsxElement(n),
        tag = el ? n.openingElement.tagName.getText(tree) : "";
      if (
        el &&
        modal &&
        tag === "div" &&
        attr(n, "className")
          ?.initializer?.getText(tree)
          .includes("dialog-actions")
      ) {
        const b = n.children.filter(
          (c) =>
            ts.isJsxElement(c) &&
            c.openingElement.tagName.getText(tree) === "Button",
        );
        if (b.length === 2) {
          pairs++;
          assert.ok(attr(b[0], "weak"), file + " close must be first");
          assert.ok(
            !attr(b[0], "disabled"),
            file + " close must remain enabled",
          );
          assert.ok(
            b[0].children.some(
              (c) => ts.isJsxText(c) && c.text.trim() === "닫기",
            ),
            file + " label",
          );
        }
      }
      ts.forEachChild(n, (c) => visit(c, modal || tag === "Modal"));
    }
    visit(tree);
  }
  assert.ok(pairs >= 10);
});
