import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { RoleProvider } from "@/lib/roles";
import { WorkspaceViewProvider } from "@/lib/workspaceView";
import { LmpViewingProvider } from "@/lib/lmpViewing";
import { LmpChatProvider } from "@/lib/lmpChat";
import { LmpCommentsDrawer } from "@/components/lmp/LmpCommentsDrawer";
import { ThemeProvider } from "@/lib/theme";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate, RouteRoleGate } from "@/components/auth/AuthGate";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CreateLmpPage from "./pages/CreateLmpPage";
import LMPBoardPage from "./pages/LMPBoardPage";
import LMPDetailPage from "./pages/LMPDetailPage";
import PocLmpBoardPage from "./pages/PocLmpBoardPage";
import CopilotPage from "./pages/CopilotPage";
import CopilotInsightsPage from "./pages/CopilotInsightsPage";
import MentorsPage from "./pages/MentorsPage";
import MentorDetailPage from "./pages/MentorDetailPage";

import MentorFeedbackPage from "./pages/MentorFeedbackPage";

import DataSourcesPage from "./pages/DataSourcesPage";
import StudentFeedbackPage from "./pages/StudentFeedbackPage";
import AlumniPage from "./pages/AlumniPage";
import StudentDetailPage from "./pages/StudentDetailPage";
import HistoryPage from "./pages/HistoryPage";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import GeneralPage from "./pages/settings/GeneralPage";
import ScoringWeightsPage from "./pages/settings/ScoringWeightsPage";
import PocDomainsPage from "./pages/settings/PocDomainsPage";
import FeedbackFormsPage from "./pages/settings/FeedbackFormsPage";
import UserManagementPage from "./pages/settings/UserManagementPage";
import SettingsDataSourcesPage from "./pages/settings/SettingsDataSourcesPage";
import PrivacyPage from "./pages/settings/PrivacyPage";
import NotificationsPage from "./pages/settings/NotificationsPage";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider>
        <RoleProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/feedback/:token" element={<StudentFeedbackPage />} />
            {/* Protected routes */}
            <Route path="*" element={
              <AuthGate>
                <WorkspaceViewProvider>
                <LmpViewingProvider>
                <LmpChatProvider>
                  <AppShell><AppRoutes /></AppShell>
                  <LmpCommentsDrawer />
                </LmpChatProvider>
                </LmpViewingProvider>
                </WorkspaceViewProvider>
              </AuthGate>
            } />
          </Routes>
        </RoleProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/dashboard" element={<DashboardPage />} />

    {/* LMP */}
    <Route path="/lmp" element={<LMPBoardPage />} />
    <Route path="/lmp/:id" element={<LMPDetailPage />} />

    {/* Process creation — admin + allocator only */}
    <Route path="/processes" element={<Navigate to="/lmp" replace />} />
    <Route path="/processes/new" element={
      <RouteRoleGate allowed={["admin", "allocator"]}>
        <CreateLmpPage />
      </RouteRoleGate>
    } />
    <Route path="/processes/:id" element={<LMPDetailPage />} />
    <Route path="/poc/:pocKey" element={<PocLmpBoardPage />} />

    {/* Legacy redirects */}
    <Route path="/requisitions" element={<Navigate to="/lmp" replace />} />
    <Route path="/requisitions/new" element={<Navigate to="/processes/new" replace />} />
    <Route path="/requisitions/:id" element={<Navigate to="/lmp" replace />} />

    {/* Shared routes */}
    <Route path="/copilot" element={<CopilotPage />} />
    {/* /copilot/insights now redirects below into the Data Sources tab */}
    <Route path="/mentors" element={<MentorsPage />} />
    <Route path="/mentors/:id" element={<MentorDetailPage />} />
    <Route path="/alumni" element={<AlumniPage />} />
    <Route path="/feedback" element={<MentorFeedbackPage />} />
    <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />

    {/* Admin-only routes */}
    <Route path="/data-sources" element={
      <RouteRoleGate allowed={["admin"]}>
        <DataSourcesPage />
      </RouteRoleGate>
    } />
    <Route path="/import-history" element={
      <RouteRoleGate allowed={["admin"]}>
        <HistoryPage />
      </RouteRoleGate>
    } />
    <Route path="/students" element={<Navigate to="/data-sources?tab=sources" replace />} />
    <Route path="/students/:rollNo" element={
      <RouteRoleGate allowed={["admin"]}>
        <StudentDetailPage />
      </RouteRoleGate>
    } />
    {/* Legacy redirects for moved pages — students/pocs/domains live inside the Sources tab */}
    <Route path="/pocs" element={<Navigate to="/data-sources?tab=sources" replace />} />
    <Route path="/domains" element={<Navigate to="/data-sources?tab=sources" replace />} />
    
    <Route path="/audit-log" element={<Navigate to="/data-sources?tab=audit-log" replace />} />
    <Route path="/copilot/insights" element={<Navigate to="/data-sources?tab=copilot-insights" replace />} />

    <Route path="/settings" element={<SettingsLayout />}>
      <Route index element={<GeneralPage />} />
      <Route path="scoring" element={<ScoringWeightsPage />} />
      <Route path="poc-domains" element={<PocDomainsPage />} />
      <Route path="feedback" element={<FeedbackFormsPage />} />
      <Route path="users" element={
        <RouteRoleGate allowed={["admin"]}>
          <UserManagementPage />
        </RouteRoleGate>
      } />
      <Route path="data-sources" element={<SettingsDataSourcesPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="privacy" element={<PrivacyPage />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
