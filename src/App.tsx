import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ToastProvider } from "./components/ui/Toast";
import { DashboardPage } from "./pages/DashboardPage";
import { MatchesPage } from "./pages/MatchesPage";
import { MatchDetailPage } from "./pages/MatchDetailPage";
import { MatchFormPage } from "./pages/MatchFormPage";
import { ReviewPage } from "./pages/ReviewPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { TrainingGoalsPage } from "./pages/TrainingGoalsPage";
import { WeeklyReviewPage } from "./pages/WeeklyReviewPage";
import { DataPage } from "./pages/DataPage";

export function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/matches/new" element={<MatchFormPage mode="create" />} />
            <Route path="/matches/:id" element={<MatchDetailPage />} />
            <Route path="/matches/:id/edit" element={<MatchFormPage mode="edit" />} />
            <Route path="/matches/:id/review" element={<ReviewPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/goals" element={<TrainingGoalsPage />} />
            <Route path="/weekly" element={<WeeklyReviewPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </ToastProvider>
    </HashRouter>
  );
}
