import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import ReportPage from './pages/ReportPage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ReportPage />} />
          <Route path="/report/:date" element={<ReportPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
