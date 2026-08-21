function analyzeLocally(code, language) {
  const issues = [];
  const lines = code.split("\n");
  const selectedLanguage = String(language || "javascript").toLowerCase();

  function addIssue(severity, line, title, message, suggestion) {
    issues.push({
      severity,
      ...(line ? { line } : {}),
      title,
      message,
      suggestion
    });
  }

  // =========================================
  // JAVASCRIPT / TYPESCRIPT
  // =========================================

  if (
    selectedLanguage === "javascript" ||
    selectedLanguage === "typescript"
  ) {
    const pairs = [
      ["(", ")"],
      ["{", "}"],
      ["[", "]"]
    ];

    for (const [open, close] of pairs) {
      const opens =
        (code.match(
          new RegExp(`\\${open}`, "g")
        ) || []).length;

      const closes =
        (code.match(
          new RegExp(`\\${close}`, "g")
        ) || []).length;

      if (opens !== closes) {
        addIssue(
          "error",
          null,
          "Unbalanced brackets",
          `Possible syntax error: ${open} and ${close} are not balanced.`,
          `Check that every ${open} has a matching ${close}.`
        );
      }
    }

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      if (/\beval\s*\(/.test(line)) {
        addIssue(
          "error",
          lineNumber,
          "Potential security risk",
          "eval() can execute dynamically generated JavaScript.",
          "Avoid eval() whenever possible."
        );
      }

      if (line.includes("console.log")) {
        addIssue(
          "warning",
          lineNumber,
          "Debugging/output statement",
          "console.log() is present in the code.",
          "Remove or replace debugging output before production deployment."
        );
      }

      if (/\bvar\s+/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Legacy variable declaration",
          "The var keyword is being used.",
          "Consider using const or let."
        );
      }

      if (/[^=]==[^=]/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Loose equality",
          "The == operator is being used.",
          "Consider using === for strict equality."
        );
      }

      if (
        /^(const|let|var)\s+/.test(trimmed) &&
        !trimmed.endsWith(";") &&
        !trimmed.endsWith("{")
      ) {
        addIssue(
          "warning",
          lineNumber,
          "Possible missing semicolon",
          "This variable declaration does not end with a semicolon.",
          "Add a semicolon if that matches the project's coding style."
        );
      }
    });
  }

  // =========================================
  // PYTHON
  // =========================================

  else if (selectedLanguage === "python") {
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      if (/\beval\s*\(/.test(line)) {
        addIssue(
          "error",
          lineNumber,
          "Potential security risk",
          "eval() can execute dynamically generated Python code.",
          "Avoid eval() and use safe parsing or explicit validation."
        );
      }

      if (/\bexec\s*\(/.test(line)) {
        addIssue(
          "error",
          lineNumber,
          "Potential security risk",
          "exec() can execute dynamically generated Python code.",
          "Avoid exec() with untrusted input."
        );
      }

      if (/\bprint\s*\(/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Debugging/output statement",
          "print() is present in the code.",
          "Use appropriate application logging where necessary."
        );
      }

      if (/^\s*except\s*:/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Broad exception handling",
          "A bare except clause catches every exception.",
          "Catch the specific exceptions your code expects."
        );
      }

      if (
        trimmed.startsWith("def ") &&
        !trimmed.includes(":")
      ) {
        addIssue(
          "error",
          lineNumber,
          "Possible invalid function declaration",
          "Python function declarations require a trailing colon.",
          "Add ':' after the function signature."
        );
      }
    });
  }

  // =========================================
  // HTML
  // =========================================

  else if (selectedLanguage === "html") {
    const openingTags = [
      "html",
      "head",
      "body",
      "div",
      "section",
      "main",
      "header",
      "footer",
      "form",
      "script",
      "style"
    ];

    for (const tag of openingTags) {
      const opens =
        (code.match(
          new RegExp(`<${tag}\\b`, "gi")
        ) || []).length;

      const closes =
        (code.match(
          new RegExp(`</${tag}>`, "gi")
        ) || []).length;

      if (opens !== closes) {
        addIssue(
          "error",
          null,
          "Possibly unclosed HTML tag",
          `<${tag}> opening and closing tags do not appear balanced.`,
          `Check that every <${tag}> has a matching </${tag}>.`
        );
      }
    }

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (/<img\b/i.test(line) && !/\balt\s*=/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Missing image alt attribute",
          "An <img> element does not contain an alt attribute.",
          "Add descriptive alt text for accessibility."
        );
      }

      if (/\bon(click|load|mouseover)\s*=/i.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Inline event handler",
          "An inline HTML event handler is being used.",
          "Consider using JavaScript event listeners instead."
        );
      }
    });
  }

  // =========================================
  // CSS
  // =========================================

  else if (selectedLanguage === "css") {
    const opens =
      (code.match(/\{/g) || []).length;

    const closes =
      (code.match(/\}/g) || []).length;

    if (opens !== closes) {
      addIssue(
        "error",
        null,
        "Unbalanced CSS braces",
        "CSS block braces are not balanced.",
        "Check that every opening { has a matching closing }."
      );
    }

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (/!important\b/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Use of !important",
          "!important can make CSS harder to maintain and override.",
          "Use stronger selectors or improve the cascade where possible."
        );
      }
    });
  }

  // =========================================
  // JAVA / C / C++ / PHP / GO
  // =========================================

  else if (
    selectedLanguage === "java" ||
    selectedLanguage === "c" ||
    selectedLanguage === "cpp" ||
    selectedLanguage === "php" ||
    selectedLanguage === "go"
  ) {
    const opens =
      (code.match(/\{/g) || []).length;

    const closes =
      (code.match(/\}/g) || []).length;

    if (opens !== closes) {
      addIssue(
        "error",
        null,
        "Unbalanced braces",
        "Opening and closing braces are not balanced.",
        "Check that every { has a matching }."
      );
    }

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (/\beval\s*\(/.test(line)) {
        addIssue(
          "error",
          lineNumber,
          "Potential security risk",
          "eval() can execute dynamically generated code.",
          "Avoid eval() whenever possible."
        );
      }
    });
  }

  // =========================================
  // SUMMARY
  // =========================================

  const errors =
    issues.filter(
      issue => issue.severity === "error"
    ).length;

  const warnings =
    issues.filter(
      issue => issue.severity === "warning"
    ).length;

  return {
    language: selectedLanguage,
    issueCount: issues.length,
    errorCount: errors,
    warningCount: warnings,
    issues,

    summary:
      issues.length === 0
        ? "No obvious issues detected by the local analyzer."
        : `${issues.length} potential issue(s) detected.`
  };
}


// =========================

module.exports = { analyzeLocally };
