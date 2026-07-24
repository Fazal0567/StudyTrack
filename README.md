# StudyTrack — Distraction-Free Daily Target Tracker

StudyTrack is a full-stack, responsive web application designed for students and self-learners to track study goals, maintain daily study streaks, manage time with interactive focus timers, and receive automated email check-in reminders.

---

## 🌟 Key Features

- **🎯 Daily Target Management**: Add, edit, prioritize, and complete study targets with subject categorization and time estimates.
- **⏱️ Focus Study Timer**: Interactive countdown timer with Web Audio sound chimes, customizable time presets (15m, 25m, 45m, 60m), and real-time radial progress gauge.
- **🌙 Dark & Light Mode Support**: Seamless toggle between eye-friendly dark mode and crisp light theme across all screens.
- **📱 Responsive Mobile-First Design**: Optimized modals, calendar view, navigation bar, and cards for smartphones, tablets, and desktop displays.
- **📧 Automated Email Reminders & App Deep-Linking**: Daily morning plans and evening summary notifications sent via SMTP with a one-click **"Open StudyTrack App"** button.
- **🔥 Streak & Progress Analytics**: Real-time streak tracking, completion percentages, and productivity insights.
- **📅 Interactive Calendar & Missed Tasks**: View historical task logs by date and carry forward missed tasks to today with a single tap.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, React Router DOM v6
- **Backend**: Node.js, Express, TypeScript (esbuild bundled)
- **Database & Auth**: Firebase Firestore & Firebase Authentication
- **Email Dispatch**: Node.js Nodemailer (supporting custom SMTP servers or direct transport)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or higher
- **npm**: v9 or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd studytrack
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your configuration:
   ```env
   # Application URL (used for email deep links)
   APP_URL="https://your-app-domain.com"

   # SMTP Configuration (Optional - for real email reminders)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   The application will start on `http://localhost:3000`.

5. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## 📁 Project Structure

```text
├── server.ts               # Express backend API for email delivery & notifications
├── src/
│   ├── components/         # Reusable UI components (Navbar, Sidebar, TaskCard, TaskModal, StudyTimerModal)
│   ├── context/            # React Context (AuthContext, ThemeContext)
│   ├── pages/              # Application Pages (Dashboard, TodaysTasks, MissedTasks, CalendarView, ProgressView, ProfilePage, SettingsPage)
│   ├── services/           # Firebase & API Services (taskService, firebase.ts)
│   ├── types.ts            # Global TypeScript Interfaces
│   ├── App.tsx             # Root Application & Route Layout
│   ├── main.tsx            # React DOM Entrypoint
│   └── index.css           # Tailwind CSS Imports & Dark Mode Variants
├── metadata.json           # Application Metadata
└── package.json            # Dependencies & Build Scripts
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
