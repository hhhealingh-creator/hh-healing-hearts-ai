import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout';
import Overview from './pages/Overview';
import ContentStudio from './pages/ContentStudio';
import CalendarPage from './pages/Calendar';
import Inbox from './pages/Inbox';
import Agents from './pages/Agents';
import Analytics from './pages/Analytics';
import Integrations from './pages/Integrations';
import SettingsPage from './pages/Settings';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="studio" element={<ContentStudio />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="agents" element={<Agents />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}