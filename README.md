CodeLens AI

AI-powered code review and debugging assistant for multiple programming languages.

CodeLens AI combines deterministic local analysis with Gemini AI to identify potential bugs, security concerns, code-quality issues, and practical improvements.

"Live Demo" (https://codelens-ai-navy.vercel.app/) · "GitHub Repository" (https://github.com/AmElBen-El/codelens-ai)

---

✨ Features

- 🤖 Gemini-powered code review
- ⚡ Fast local static analysis
- 🔍 Error and warning detection
- 🛡️ Security-pattern checks
- 🌐 Multi-language support
- 📍 Line-specific issue reporting
- 💡 Actionable recommendations
- 🧩 AI-generated corrected code
- 📋 Copy review and code results
- 📱 Responsive developer-focused UI
- 🔄 Gemini model fallback handling

Supported Languages

JavaScript · TypeScript · Python · HTML · CSS · Java · C · C++ · PHP · Go

---

🏗️ Architecture

flowchart TD
    A[Developer] --> B[CodeLens Web UI]
    B --> C[Express REST API]

    C --> D[Local Analyzer]
    C --> E[Gemini AI]

    D --> F[Combined Review]
    E --> F

    F --> G[Review Results]

CodeLens uses a two-layer review architecture:

- Local Analyzer — fast, deterministic checks for common coding and security patterns.
- Gemini AI — contextual code review, explanations, recommendations, and corrected code.
- Combined Review — presents both analysis layers in a single developer-focused interface.

---

🛠️ Tech Stack

Frontend

- HTML5
- CSS3
- Vanilla JavaScript

Backend

- Node.js
- Express.js

AI

- Google Gemini
- "@google/genai"

Testing & Deployment

- Node.js Test Runner
- Git / GitHub
- Vercel

---

🧪 Testing

The local analyzer includes automated tests covering:

- JavaScript debugging statements
- Python output statements
- HTML accessibility issues
- JavaScript security patterns
- Clean JavaScript
- Clean Python

6 tests
6 passed
0 failed

Run tests:

npm test

---

🚀 Run Locally

git clone https://github.com/AmElBen-El/codelens-ai.git
cd codelens-ai
npm install

Create ".env":

GEMINI_API_KEY=your_api_key

Start the application:

npm start

Open:

http://localhost:3000

---

📌 Project Status

Production-ready MVP

CodeLens AI demonstrates practical full-stack development, AI API integration, static analysis, automated testing, Git workflows, and cloud deployment.

---

👨‍💻 Author

Moses Ayabiogbe
Full-Stack Web & Mobile Developer

"Live Demo" (https://codelens-ai-navy.vercel.app/)