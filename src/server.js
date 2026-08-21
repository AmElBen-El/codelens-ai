require("dotenv").config();

const express = require("express");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY
    })
  : null;

app.use(express.json({ limit: "1mb" }));

app.use(
  express.static(
    path.join(__dirname, "../public")
  )
);


// =========================
// HEALTH CHECK
// =========================

app.get("/api/health", (req, res) => {

  res.json({
    success: true,
    localAnalyzer: true,
    geminiConfigured: Boolean(ai),
    message: "CodeLens AI server is running"
  });

});


// =========================
// LOCAL ANALYZER
// =========================

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
// GEMINI REVIEW
// =========================


  async function reviewWithGemini(code, language) {

  if (!ai) {
    return {
      available: false,
      model: null,
      message: "Gemini API is not configured."
    };
  }

  const prompt = `
You are CodeLens AI, a senior software engineer
performing a professional code review.

Analyze this ${language} code.

Return a clear technical review containing:

1. OVERALL ASSESSMENT
2. ERRORS
3. WARNINGS
4. SECURITY CONCERNS
5. PERFORMANCE CONCERNS
6. CODE QUALITY
7. RECOMMENDED IMPROVEMENTS
8. CORRECTED CODE

For every genuine problem:

- Explain what is wrong.
- Explain why it matters.
- Give the line number when possible.
- Give a practical fix.

Do not invent problems.

Clearly distinguish actual errors from
warnings and optional improvements.

Here is the code:

---------------- CODE ----------------

${code}

-------------- END CODE --------------
`;

  // Current Gemini models available to CodeLens.
  // Do not add retired/unsupported Gemini 2.5 models.
  const models = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite"
  ];

  let lastError = null;

  for (const model of models) {

    try {

      console.log(
        `Sending request to Gemini model: ${model}`
      );

      const response =
        await ai.models.generateContent({
          model,
          contents: prompt
        });

      const text =
        response?.text || "";

      if (!text.trim()) {

        throw new Error(
          `${model} returned an empty response.`
        );

      }

      console.log(
        `Gemini response received from ${model}.`
      );

      return {
        available: true,
        model,
        review: text
      };

    } catch (error) {

      lastError = error;

      const status =
        Number(
          error?.status ||
          error?.code ||
          error?.error?.code ||
          0
        );

      const message =
        error?.message ||
        error?.error?.message ||
        String(error);

      console.error(
        `Gemini model ${model} failed (${status}):`,
        message
      );

      /*
       * 403 normally means the API key/project does not
       * have permission to make the request.
       *
       * Trying several models will not normally fix
       * an authentication/permission problem.
       */
      if (status === 403) {

        return {
          available: false,
          model,
          errorCode: 403,
          message:
            "Gemini API permission denied. Check the API key, project, and API access."
        };

      }

      /*
       * These errors are normally temporary or model-specific.
       * Continue to the next model.
       */
      if (
        status === 429 ||
        status === 503 ||
        status === 404 ||
        status === 500 ||
        status === 502 ||
        status === 504 ||
        status === 0
      ) {

        console.log(
          `Trying next Gemini model after ${model} failure...`
        );

        continue;
      }

      /*
       * Unknown errors are also passed to the next model.
       * This gives CodeLens additional resilience against
       * provider/network changes.
       */
      console.log(
        `Unexpected Gemini error on ${model}. Trying next model...`
      );

    }

  }

  console.error(
    "All Gemini models failed."
  );

  return {
    available: false,
    model: null,
    errorCode:
      lastError?.status ||
      lastError?.code ||
      lastError?.error?.code ||
      null,
    message:
      `Gemini review failed after trying ${models.length} models. ` +
      (
        lastError?.message ||
        lastError?.error?.message ||
        "All configured Gemini models were unavailable."
      )
  };
  };


// =========================
// REVIEW ENDPOINT
// =========================

app.post("/api/review", async (req, res) => {

  try {

    const {
      code,
      language
    } = req.body;


    if (
      typeof code !== "string" ||
      !code.trim()
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Code is required."

      });

    }


    const selectedLanguage =
      language || "javascript";


    console.log(
      "Starting local analysis..."
    );


    const local =
      analyzeLocally(
        code,
        selectedLanguage
      );


    console.log(
      "Local analysis complete."
    );


    const aiReview =
      await reviewWithGemini(
        code,
        selectedLanguage
      );


    console.log(
      "Returning review to browser."
    );


    return res.json({

      success: true,

      local,

      ai: aiReview

    });

  } catch (error) {

    console.error(
      "Review endpoint error:",
      error
    );


    return res.status(500).json({

      success: false,

      error:
        error.message ||
        "Code review failed."

    });

  }

});


// =========================
// START SERVER
// =========================

app.listen(PORT, "0.0.0.0", () => {

  console.log(
    `CodeLens AI running on http://127.0.0.1:${PORT}`
  );

});
