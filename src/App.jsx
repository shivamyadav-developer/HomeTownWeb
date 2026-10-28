import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { LeadsProvider } from './context/LeadsContext.jsx';
import Layout from './components/Layout.jsx';
import { Spinner } from './components/ui.jsx';
import Login from './pages/Login.jsx';

// Route-level code splitting keeps the first load small.
const Target = lazy(() => import('./pages/Target.jsx'));
const Leaderboard = lazy(() => import('./pages/Leaderboard.jsx'));
const Courses = lazy(() => import('./pages/Courses.jsx'));
const CourseDetails = lazy(() => import('./pages/CourseDetails.jsx'));
const Quiz = lazy(() => import('./pages/Quiz.jsx'));
const Attendance = lazy(() => import('./pages/Attendance.jsx'));
const Leads = lazy(() => import('./pages/Leads.jsx'));
const LeadDetails = lazy(() => import('./pages/LeadDetails.jsx'));
const NewLead = lazy(() => import('./pages/NewLead.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Checklists = lazy(() => import('./pages/Checklists.jsx'));
const ChecklistForm = lazy(() => import('./pages/ChecklistForm.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Help = lazy(() => import('./pages/Help.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

function Protected({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Suspense fallback={<Spinner full />}>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/target" replace /> : <Login />} />

        <Route
          element={
            <Protected>
              <LeadsProvider>
                <Layout />
              </LeadsProvider>
            </Protected>
          }
        >
          <Route index element={<Navigate to="/target" replace />} />
          <Route path="/target" element={<Target />} />
          <Route path="/leaders" element={<Leaderboard />} />
          <Route path="/lms" element={<Courses />} />
          <Route path="/lms/:id" element={<CourseDetails />} />
          <Route path="/attend" element={<Attendance />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/:id" element={<LeadDetails />} />
          <Route path="/new-lead" element={<NewLead />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/checklist" element={<Checklists />} />
          <Route path="/checklist/:id" element={<ChecklistForm />} />
          {/* Profile → Help & Information (same pages as the mobile app) */}
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/help" element={<Help />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Quiz is full-screen (no navigation chrome), like the reference design. */}
        <Route
          path="/lms/:id/quiz"
          element={
            <Protected>
              <Quiz />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/target' : '/login'} replace />} />
      </Routes>
    </Suspense>
  );
}
