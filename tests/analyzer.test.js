const test = require("node:test");
const assert = require("node:assert/strict");

const { analyzeLocally } = require("../src/analyzer");

test("JavaScript console.log produces a warning", () => {
  const result = analyzeLocally(
    `
function add(a, b) {
  return a + b;
}

console.log(add(5, 3));
`,
    "javascript"
  );

  assert.ok(
    result.issues.some(
      issue =>
        /Debugging\/output statement/i.test(issue.title) &&
        issue.severity === "warning"
    )
  );
});

test("Python print produces a warning", () => {
  const result = analyzeLocally(
    `
def add(a, b):
    return a + b

print(add(5, 3))
`,
    "python"
  );

  assert.ok(
    result.issues.some(
      issue =>
        issue.severity === "warning" &&
        /print/i.test(issue.title + " " + issue.message)
    )
  );
});

test("HTML missing image attributes is detected", () => {
  const result = analyzeLocally(
    `
<!DOCTYPE html>
<html>
<body>
<img src="photo.jpg">
</body>
</html>
`,
    "html"
  );

  assert.ok(
    result.issues.some(
      issue =>
        /image|img|alt/i.test(
          issue.title + " " + issue.message
        )
    )
  );
});

test("JavaScript eval produces a security error", () => {
  const result = analyzeLocally(
    `
const input = userInput;
eval(input);
`,
    "javascript"
  );

  assert.ok(
    result.issues.some(
      issue =>
        issue.severity === "error" &&
        /eval/i.test(issue.title + " " + issue.message)
    )
  );
});

test("Clean JavaScript has no issues", () => {
  const result = analyzeLocally(
    `
function add(a, b) {
  return a + b;
}
`,
    "javascript"
  );

  assert.equal(result.errorCount, 0);
});

test("Clean Python has no issues", () => {
  const result = analyzeLocally(
    `
def add(a, b):
    return a + b
`,
    "python"
  );

  assert.equal(result.errorCount, 0);
});