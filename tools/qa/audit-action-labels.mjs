import ts from "typescript";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(dir + "/" + e.name)
      : e.name.endsWith(".tsx")
        ? [dir + "/" + e.name]
        : [],
  );
}
const results = [],
  titles = [];
for (const file of files("apps/miniapp/src")) {
  const tree = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  function visit(n, inModal = false) {
    const element = ts.isJsxElement(n),
      tag = element ? n.openingElement.tagName.getText(tree) : "";
    if (element && tag === "Modal") {
      const attr = n.openingElement.attributes.properties.find(
        (a) => ts.isJsxAttribute(a) && a.name.getText(tree) === "title",
      );
      if (attr?.initializer) {
        const values = [];
        const scan = (e) => {
          if (ts.isStringLiteralLike(e)) values.push(e.text);
          else ts.forEachChild(e, scan);
        };
        scan(attr.initializer);
        titles.push({
          file,
          line: tree.getLineAndCharacterOfPosition(n.getStart(tree)).line + 1,
          values,
        });
      }
    }
    if (element && tag === "Button") {
      const texts = [],
        forced = [];
      function text(c) {
        if (ts.isJsxText(c)) {
          const v = c.text.replace(/\s+/g, " ").trim();
          if (v) texts.push(v);
        } else if (ts.isStringLiteralLike(c)) texts.push(c.text);
        else if (ts.isJsxElement(c)) {
          c.children.forEach(text);
        } else if (ts.isJsxSelfClosingElement(c)) {
          if (c.tagName.getText(tree) === "br") forced.push("br");
        } else if (ts.isJsxExpression(c) && c.expression) {
          expression(c.expression);
        }
      }
      function expression(e) {
        if (ts.isStringLiteralLike(e)) texts.push(e.text);
        else ts.forEachChild(e, expression);
      }
      n.children.forEach(text);
      results.push({
        file,
        line: tree.getLineAndCharacterOfPosition(n.getStart(tree)).line + 1,
        popup: inModal,
        texts,
        forcedBreaks: forced.length,
      });
    }
    ts.forEachChild(n, (c) => visit(c, inModal || tag === "Modal"));
  }
  visit(tree);
}
const report = {
  titles,
  longTitles: titles.filter((t) => t.values.some((v) => v.length > 17)),
  buttons: results.length,
  popupButtons: results.filter((r) => r.popup).length,
  forcedBreaks: results.filter((r) => r.forcedBreaks),
  longPopupFragments: results.filter(
    (r) => r.popup && r.texts.some((s) => s.length > 12),
  ),
  results,
};
mkdirSync("output/qa/action-labels", { recursive: true });
writeFileSync(
  "output/qa/action-labels/audit.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({ ...report, results: undefined, titles: undefined }),
);
if (report.forcedBreaks.length || report.longPopupFragments.length)
  process.exitCode = 1;
