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

  // --------------------------------------------------
  // Bracket balance
  // --------------------------------------------------

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

  // --------------------------------------------------
  // JavaScript / TypeScript
  // --------------------------------------------------

  if (
    selectedLanguage === "javascript" ||
    selectedLanguage === "typescript"
  ) {
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      if (/\bconsole\.log\s*\(/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Debugging statement",
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

      if (/\beval\s*\(/.test(line)) {
        addIssue(
          "error",
          lineNumber,
          "Potential security risk",
          "eval() can execute dynamically generated JavaScript.",
          "Avoid eval() whenever possible."
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

      if (
        selectedLanguage === "typescript" &&
        /\bany\b/.test(line)
      ) {
        addIssue(
          "warning",
          lineNumber,
          "Explicit any type",
          "The any type reduces TypeScript's static type safety.",
          "Use a more specific type where practical."
        );
      }
    });
  }

  // --------------------------------------------------
  // Python
  // --------------------------------------------------

  if (selectedLanguage === "python") {
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      if (/\bprint\s*\(/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Debugging/output statement",
          "print() is present in the code.",
          "Remove debugging output or replace it with appropriate application logging."
        );
      }

      if (/\beval\s*\(/.test(line)) {
        addIssue(
          "error",
          lineNumber,
          "Potential security risk",
          "eval() can execute dynamically supplied Python code.",
          "Avoid eval() when processing untrusted input."
        );
      }

      if (/\bexec\s*\(/.test(line)) {
        addIssue(
          "error",
          lineNumber,
          "Potential security risk",
          "exec() can execute dynamically generated Python code.",
          "Avoid exec() with untrusted or dynamic input."
        );
      }

      if (
        trimmed &&
        !trimmed.startsWith("#") &&
        /:\s*$/.test(trimmed) === false &&
        /^\s*(if|for|while|def|class|try|except|finally|with)\b/.test(trimmed)
      ) {
        // Intentionally do not flag indentation here.
        // Python indentation requires parser-level analysis.
      }
    });
  }

  // --------------------------------------------------
  // HTML
  // --------------------------------------------------

  if (selectedLanguage === "html") {
    if (/<script\b[^>]*src=["'][^"']+["'][^>]*>/i.test(code)) {
      addIssue(
        "warning",
        null,
        "External script detected",
        "The HTML document loads an external JavaScript file.",
        "Verify that external scripts come from trusted sources and use appropriate security controls."
      );
    }

    if (/<img\b(?![^>]*\balt\s*=)/i.test(code)) {
      addIssue(
        "warning",
        null,
        "Missing image alt text",
        "An image element appears to be missing an alt attribute.",
        "Add meaningful alt text for accessibility, or use an empty alt attribute for decorative images."
      );
    }

    if (/style\s*=/i.test(code)) {
      addIssue(
        "warning",
        null,
        "Inline CSS",
        "Inline style attributes are being used.",
        "Consider moving reusable styling into a CSS stylesheet."
      );
    }

    if (/onclick\s*=/i.test(code)) {
      addIssue(
        "warning",
        null,
        "Inline event handler",
        "An inline onclick handler is being used.",
        "Consider attaching event listeners from JavaScript instead."
      );
    }
  }

  // --------------------------------------------------
  // CSS
  // --------------------------------------------------

  if (selectedLanguage === "css") {
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (/!important\b/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Use of !important",
          "!important can make CSS harder to override and maintain.",
          "Use stronger selectors or improve the cascade where practical."
        );
      }

      if (/\beval\s*\(/.test(line)) {
        addIssue(
          "error",
          lineNumber,
          "Unexpected eval() usage",
          "eval-like executable content was detected.",
          "Remove executable dynamic code from CSS."
        );
      }
    });
  }

  // --------------------------------------------------
  // Java
  // --------------------------------------------------

  if (selectedLanguage === "java") {
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (/System\.out\.println\s*\(/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Debugging/output statement",
          "System.out.println() is present.",
          "Use an appropriate logging framework for production applications."
        );
      }

      if (/\b==\s*["']/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Possible string comparison issue",
          "The == operator may be comparing object references instead of string values.",
          "Use .equals() when comparing Java String values."
        );
      }
    });
  }

  // --------------------------------------------------
  // C / C++
  // --------------------------------------------------

  if (
    selectedLanguage === "c" ||
    selectedLanguage === "cpp"
  ) {
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (/\bgets\s*\(/.test(line)) {
        addIssue(
          "error",
          lineNumber,
          "Unsafe input function",
          "gets() can cause buffer overflow vulnerabilities.",
          "Use a bounded input function such as fgets()."
        );
      }

      if (/\bprintf\s*\(/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Console output",
          "printf() is present in the code.",
          "Use appropriate logging or remove debugging output before production."
        );
      }

      if (/\bstrcpy\s*\(/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Potential buffer overflow",
          "strcpy() does not perform bounds checking.",
          "Prefer a bounds-aware string handling approach."
        );
      }
    });
  }

  // --------------------------------------------------
  // PHP
  // --------------------------------------------------

  if (selectedLanguage === "php") {
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (/\beval\s*\(/.test(line)) {
        addIssue(
          "error",
          lineNumber,
          "Potential security risk",
          "PHP eval() executes dynamically generated PHP code.",
          "Avoid eval(), especially with user-controlled input."
        );
      }

      if (/\bvar_dump\s*\(/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Debugging statement",
          "var_dump() is present in the code.",
          "Remove debugging output before production deployment."
        );
      }

      if (/\bmysql_query\s*\(/.test(line)) {
        addIssue(
          "error",
          lineNumber,
          "Deprecated database API",
          "The mysql_query() API is obsolete in modern PHP.",
          "Use PDO or MySQLi with parameterized queries."
        );
      }
    });
  }

  // --------------------------------------------------
  // Go
  // --------------------------------------------------

  if (selectedLanguage === "go") {
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (/\bfmt\.Print/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Console output",
          "fmt.Print* is present in the code.",
          "Use structured logging where appropriate for production applications."
        );
      }

      if (/\bpanic\s*\(/.test(line)) {
        addIssue(
          "warning",
          lineNumber,
          "Panic usage",
          "panic() can terminate the application unexpectedly.",
          "Handle recoverable errors explicitly where appropriate."
        );
      }
    });
  }

  // --------------------------------------------------
  // Calculate statistics
  // --------------------------------------------------

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
