# 🍽️ Smart Mess Feedback System

## 🚀 Overview
A real-time, AI-powered feedback system designed for college messes.  
Students scan a QR code to instantly submit feedback for the current meal, and supervisors receive actionable insights through a dashboard.

---

## 🎯 Problem
- Mess feedback systems are slow and inefficient  
- Students rarely give feedback due to friction  
- Mess operators lack real-time insights  
- No system identifies critical issues instantly  

---

## 💡 Solution
We built a **QR-based, time-restricted feedback system** that ensures:
- Fast feedback submission (under 10 seconds)
- Feedback only for the current meal (prevents misuse)
- Mess-specific tracking using QR codes
- AI-powered analysis for better decision-making

---

## ⚙️ How It Works

1. **Student scans QR code** in the mess  
2. System automatically detects:
   - Mess (via QR)
   - Meal time (Breakfast/Lunch/Snacks/Dinner)
3. Student submits quick feedback:
   - Rating ⭐
   - Complaint tags (Taste, Hygiene, Quantity, Quality)
   - Optional comment
4. Feedback is stored in the database  
5. AI analyzes feedback and generates:
   - Summary
   - Severity level  
6. Supervisor views results in real-time dashboard  

---

## 🔥 Key Features

- 📱 QR-based feedback system (no manual input)
- ⏱️ Time-restricted feedback (only current meal)
- 🧠 AI-powered analysis (summary + severity detection)
- 📊 Real-time admin dashboard
- 🚨 Critical issue detection (instant alerts)

---

## 🧠 AI Capabilities

- Classifies feedback into categories  
- Detects severity of issues  
- Generates short summaries  
- Identifies patterns in complaints  

---

## 🛠️ Tech Stack

- **Frontend:** React (Vite) + Tailwind CSS  
- **Backend & Database:** Supabase  
- **AI:** Azure OpenAI  
- **Deployment:** Vercel  

---

## 📊 Example Use Case

> A student scans the QR code during lunch and reports “Food was cold.”  
> The system analyzes it and flags a quality issue.  
> If multiple similar complaints appear, the dashboard highlights it as a critical trend.

---

## 🚀 Future Improvements

- Mess ranking system (best vs worst mess)  
- Daily AI-generated reports  
- Notification system for urgent issues  
- Supervisor authentication system  

---

## 👨‍💻 Author

**Harshit Kakoria**

---

## 🎤 Pitch Summary

> “We built a smart, real-time feedback system for college messes using QR codes and AI. It ensures fast, relevant feedback and helps supervisors take immediate action based on real insights.”

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
