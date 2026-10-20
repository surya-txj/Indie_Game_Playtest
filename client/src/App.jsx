import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import PublicGamesPage from './pages/PublicGamesPage.jsx';
import AcceptInvitePage from './pages/AcceptInvitePage.jsx';
import BuildOverviewPage from './pages/BuildOverviewPage.jsx';
import SessionPage from './pages/SessionPage.jsx';
import ReportFormPage from './pages/ReportFormPage.jsx';
import ReportDetailPage from './pages/ReportDetailPage.jsx';
import ClustersPage from './pages/ClustersPage.jsx';
import IssueBoardPage from './pages/IssueBoardPage.jsx';
import AssistantPage from './pages/AssistantPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const MEMBERS = ['developer', 'coordinator'];

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/games" element={<PublicGamesPage />} />
        <Route path="/games/:slug" element={<PublicGamesPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<BuildOverviewPage />} />
          <Route path="/sessions/:id" element={<SessionPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
        </Route>
        <Route element={<ProtectedRoute roles={['tester']} />}>
          <Route path="/invite/:token" element={<AcceptInvitePage />} />
          <Route path="/sessions/:id/report" element={<ReportFormPage />} />
        </Route>
        <Route element={<ProtectedRoute roles={MEMBERS} />}>
          <Route path="/clusters" element={<ClustersPage />} />
          <Route path="/issues" element={<IssueBoardPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
        </Route>

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
