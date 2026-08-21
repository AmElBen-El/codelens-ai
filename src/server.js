require("dotenv").config();
const { analyzeLocally } = require("./analyzer");

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
