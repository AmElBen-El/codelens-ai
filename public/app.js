const reviewBtn = document.getElementById("reviewBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");

const codeInput = document.getElementById("code");
const language = document.getElementById("language");

const result = document.getElementById("result");
const lineNumbers = document.getElementById("lineNumbers");
const characterCount = document.getElementById("characterCount");


function updateLineNumbers() {

  if (!codeInput || !lineNumbers) return;

  const lines = codeInput.value.split("\n").length;

  lineNumbers.textContent =
    Array.from(
      { length: lines },
      (_, i) => i + 1
    ).join("\n");
}


function updateCharacterCount() {

  if (!codeInput || !characterCount) return;

  characterCount.textContent =
    `${codeInput.value.length.toLocaleString()} characters`;
}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatAIReview(text) {

  if (!text) {
    return "";
  }

  let value = escapeHTML(text);

  const codeBlocks = [];

  // Extract fenced code blocks
  value = value.replace(
    /```(?:javascript|typescript|python|html|css|java|cpp|c|php|go|json|bash|sql)?\s*([\s\S]*?)```/gi,
    (_, code) => {

      const index = codeBlocks.length;

      codeBlocks.push(code.trim());

      return `@@CODEBLOCK_${index}@@`;
    }
  );

  // Remove horizontal Markdown rules
  value = value.replace(
    /^\s*---+\s*$/gm,
    ""
  );

  // Main Markdown heading
  value = value.replace(
    /^#\s+(.+)$/gm,
    '<h3 class="ai-main-heading">$1</h3>'
  );

  // Secondary headings
  value = value.replace(
    /^##\s+(.+)$/gm,
    '<h4 class="ai-heading">$1</h4>'
  );

  value = value.replace(
    /^###\s+(.+)$/gm,
    '<h4 class="ai-heading">$1</h4>'
  );

  // Numbered section headings
  value = value.replace(
    /^(\d+)\.\s+([A-Z][A-Z\s&_-]+)$/gm,
    '<div class="ai-section-heading">$1. $2</div>'
  );

  // Bold Markdown
  value = value.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

  // Italic Markdown
  value = value.replace(
    /\*(.*?)\*/g,
    "<em>$1</em>"
  );

  // Bullet points
  value = value.replace(
    /^\s*[•*-]\s+(.+)$/gm,
    '<div class="ai-bullet">• $1</div>'
  );

  // Numbered lists
  value = value.replace(
    /^\s*(\d+)\.\s+(.+)$/gm,
    '<div class="ai-numbered"><strong>$1.</strong> $2</div>'
  );

  // Code-like inline text
  value = value.replace(
    /`([^`]+)`/g,
    '<code class="inline-code">$1</code>'
  );

  // Paragraph spacing
  value = value.replace(
    /\n{2,}/g,
    '<div class="ai-spacer"></div>'
  );

  // Remaining line breaks
  value = value.replace(
    /\n/g,
    "<br>"
  );

  // Restore code blocks
  codeBlocks.forEach((code, index) => {

    const block = `
      <div class="code-block">

        <div class="code-block-header">

          <span>
            Corrected Code
          </span>

          <button
            type="button"
            class="copy-ai-code"
            data-code-index="${index}"
          >
            Copy
          </button>

        </div>

        <pre><code>${code}</code></pre>

      </div>
    `;

    value = value.replace(
      `@@CODEBLOCK_${index}@@`,
      block
    );
  });

  return value;
}



function renderReview(data) {

  const local = data.local || {};
  const ai = data.ai || {};

  let html = "";


  html += `
    <div class="review-summary">

      <div class="summary-title">
        CodeLens Analysis
      </div>

      <div class="summary-text">
        ${escapeHTML(local.summary || "Analysis complete.")}
      </div>

    </div>
  `;


  const issues = local.issues || [];

  const errors =
    issues.filter(
      issue => issue.severity === "error"
    ).length;

  const warnings =
    issues.filter(
      issue => issue.severity === "warning"
    ).length;


  html += `
    <div class="review-summary">

      <div class="summary-title">
        Code Statistics
      </div>

      <div class="summary-text">

        ${codeInput.value.split("\n").length} lines
        ·
        ${codeInput.value.length} characters
        ·
        ${issues.length} issues
        ·
        ${errors} errors
        ·
        ${warnings} warnings

      </div>

    </div>
  `;


  html += `
    <div class="summary-title">
      Local Analysis
    </div>
  `;


  if (issues.length === 0) {

    html += `
      <div class="issue"
        style="border-left-color:var(--success);">

        <div
          class="issue-number"
          style="color:var(--success);"
        >
          PASS
        </div>

        No obvious issues detected
        by the local analyzer.

      </div>
    `;

  } else {

    issues.forEach((issue, index) => {

      const color =
        issue.severity === "error"
          ? "var(--danger)"
          : "var(--warning)";

      const label =
        issue.severity === "error"
          ? "ERROR"
          : "WARNING";


      html += `
        <div
          class="issue"
          style="border-left-color:${color};"
        >

          <div
            class="issue-number"
            style="color:${color};"
          >

            ${label} ${index + 1}

            ${
              issue.line
                ? ` · LINE ${issue.line}`
                : ""
            }

          </div>

          <strong>
            ${escapeHTML(issue.title)}
          </strong>

          <div style="margin-top:7px;">
            ${escapeHTML(issue.message)}
          </div>

          <div
            style="
              margin-top:10px;
              color:var(--muted);
              font-size:12px;
            "
          >

            Suggested action:
            ${escapeHTML(issue.suggestion)}

          </div>

        </div>
      `;

    });

  }


  const modelName = ai.model
  ? ai.model.replace(/^gemini-/, "Gemini ")
  : "Gemini AI";

html += `
  <div
    class="summary-title"
    style="margin-top:25px;"
  >
    Gemini AI Review

    ${
      ai.available && ai.model
        ? `
          <span
            style="
              margin-left:8px;
              font-size:11px;
              font-weight:500;
              color:var(--muted);
            "
          >
            • ${escapeHTML(modelName)}
          </span>
        `
        : ""
    }

  </div>
`;


  if (ai.available && ai.review) {

    html += `
      <div class="review-summary">

        <div class="summary-text ai-review">

          ${formatAIReview(ai.review)}

        </div>

      </div>
    `;

  } else {

    html += `
      <div class="issue">

        <div class="issue-number">
          AI REVIEW UNAVAILABLE
        </div>

        ${escapeHTML(
          ai.message ||
          "Gemini review was unavailable."
        )}

      </div>
    `;

  }


  html += `
    <div class="recommendation">

      <div class="recommendation-title">
        NEXT STEP
      </div>

      Review the detected issues,
      compare them with the Gemini analysis,
      and test your corrected code.

    </div>
  `;


  result.innerHTML = html;

  result
  .querySelectorAll(".copy-ai-code")
  .forEach(button => {

    button.addEventListener("click", async () => {

      const index =
        Number(button.dataset.codeIndex);

      const blocks =
        result.querySelectorAll(".code-block pre code");

      const code =
        blocks[index]?.textContent || "";

      try {

        await navigator.clipboard.writeText(code);

        const original =
          button.textContent;

        button.textContent = "Copied!";

        setTimeout(() => {
          button.textContent = original;
        }, 1500);

      } catch (error) {

        console.error(
          "Copy AI code failed:",
          error
        );

      }

    });

  });
}


if (codeInput) {

  codeInput.addEventListener(
    "input",
    () => {

      updateLineNumbers();
      updateCharacterCount();

    }
  );

}


if (reviewBtn) {

  reviewBtn.addEventListener(
    "click",
    async () => {

      const code =
        codeInput.value.trim();


      if (!code) {

        result.innerHTML = `
          <div class="empty-state">

            <div class="empty-icon">!</div>

            <h3>No code provided</h3>

            <p>
              Paste code before starting
              the review.
            </p>

          </div>
        `;

        return;
      }


      reviewBtn.disabled = true;
      reviewBtn.textContent = "Analyzing...";


      result.innerHTML = `
        <div class="empty-state">

          <div class="empty-icon">
            ...
          </div>

          <h3>Analyzing code</h3>

          <p>
            CodeLens is running local
            analysis and Gemini AI review.
          </p>

        </div>
      `;


      try {

        const response =
          await fetch("/api/review", {

            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              code,

              language:
                language
                  ? language.value
                  : "javascript"

            })

          });


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Review request failed."
          );

        }


        renderReview(data);


      } catch (error) {

        console.error(
          "Review error:",
          error
        );


        result.innerHTML = `
          <div class="empty-state">

            <div class="empty-icon">
              !
            </div>

            <h3>Review failed</h3>

            <p>
              ${escapeHTML(error.message)}
            </p>

          </div>
        `;

      } finally {

        reviewBtn.disabled = false;
        reviewBtn.textContent =
          "Review Code";

      }

    }
  );

}


if (clearBtn) {

  clearBtn.addEventListener(
    "click",
    () => {

      codeInput.value = "";

      updateLineNumbers();
      updateCharacterCount();


      result.innerHTML = `
        <div class="empty-state">

          <div class="empty-icon">
            ✓
          </div>

          <h3>Ready to review</h3>

          <p>
            Paste your code and click
            <strong>Review Code</strong>
            to begin.
          </p>

        </div>
      `;

    }
  );

}


if (copyBtn) {

  copyBtn.addEventListener(
    "click",
    async () => {

      const text =
        result.innerText.trim();


      if (!text) return;


      try {

        await navigator.clipboard
          .writeText(text);


        const original =
          copyBtn.textContent;


        copyBtn.textContent =
          "Copied!";


        setTimeout(() => {

          copyBtn.textContent =
            original;

        }, 1500);


      } catch (error) {

        console.error(
          "Copy failed:",
          error
        );

      }

    }
  );

}


updateLineNumbers();
updateCharacterCount();
