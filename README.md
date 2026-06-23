# 🧠 MindFlow AI

MindFlow AI is a premium, AI-powered student productivity companion and academic performance analytics dashboard. It combines modern task management, rich-text note taking, and focus enhancement techniques with Machine Learning and Generative AI to optimize students' habits and predict academic outcomes.

---

## 🚀 Core Features

### 📝 Rich-Text Note Manager
- **Tiptap Editor Integration:** Fully customized rich-text editor with support for font styling, highlight, text alignment, lists, links, images, tables, and YouTube video embeds.
- **AI Summary Companion:** Automatically summarize lengthy notes and extract key action items using the Gemini API.
- **Local File & Asset Upload:** Integrated server-side API for uploading images/assets directly to notes.

### 📋 Smart Task Manager (To-Do)
- Interactive task tracking with customizable priority scores (0–100) and difficulty levels (1–10).
- Effortless status tracking to structure daily workloads.

### ⏱️ Pomodoro Timer with Fuzzy Logic
- **Fuzzy Logic Recommendation Engine:** Instead of a rigid 25-minute timer, MindFlow AI uses a built-in Mamdani-style fuzzy logic controller.
- Takes **Task Priority** and **Difficulty** as inputs, and dynamically defuzzifies them (using the centroid method) to recommend a tailored focus duration (Short: 25m, Medium: 40m, Long: 50m) and associated break durations.

### 🤖 AI Study Assistant
- A persistent chat companion integrated with Gemini to answer student questions, explain complex concepts, debug code, or recommend learning resources.

### 📊 Academic Performance Analytics
- Full-screen dashboard displaying student statistics, class attendance trends, study-to-relaxation ratios, and performance metrics over time.

### 🌲 ML-Based Student Performance Assessment
- **Random Forest Classifier:** A custom Machine Learning pipeline trained on student habits.
- Inputs student data: study hours, screen time, sleep quality, class attendance, diet quality, physical exercise, and parental education.
- Predicts academic category (`Low`, `Average`, `Good`, `Excellent`), provides a confidence score, lists specific personal **strengths** and **weaknesses**, and generates targeted recommendations.

---

## 🛠️ Tech Stack & Architecture

- **Frontend / Full-stack:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide React icons
- **Rich-text editing:** Tiptap Editor (`@tiptap/react`, `@tiptap/starter-kit`)
- **Database, Auth & Hosting:** Firebase (Firestore, Firebase Authentication, Cloud Storage, Firebase Hosting)
- **Machine Learning Pipeline:** Python 3 (Scikit-Learn, Pandas, NumPy, Joblib)
- **Generative AI:** Google Gemini API (via Firebase AI logic / Server-side router)

---

## ⚙️ Installation & Setup Guide

Follow these steps to set up MindFlow AI locally:

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js** (v18.x or later)
- **NPM** or **Yarn**
- **Python 3** (v3.8 or later) with `pip`

---

### 2. Backend & ML Setup
Install the Python library dependencies for the Random Forest prediction pipeline:
```bash
pip3 install -r ml/requirements.txt
```
To retrain the ML model using the student habits dataset:
```bash
python3 ml/train.py
```
*(This will generate updated `model.pkl`, `encoder.pkl`, and `scaler.pkl` files inside the `ml/` directory).*

---

### 3. Frontend & Next.js Setup
1. Install Node.js package dependencies:
   ```bash
   npm install
   ```

2. Copy the environment variables template:
   ```bash
   cp .env.example .env.local
   ```

3. Open `.env.local` and populate it with your Firebase configuration credentials and your Gemini API key:
   - Create a Firebase project at the [Firebase Console](https://console.firebase.google.com/).
   - Obtain web app credentials from Project Settings.
   - Obtain a Gemini API Key from [Google AI Studio](https://aistudio.google.com/).

---

### 4. Running Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

### 5. Production Build
To create an optimized production build:
```bash
npm run build
npm start
```
