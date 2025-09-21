import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { ContentDiscovery } from './pages/ContentDiscovery';
import { TranslationWorkspace } from './pages/TranslationWorkspace';
import { ReviewWorkspace } from './pages/ReviewWorkspace';
import { PublishingDashboard } from './pages/PublishingDashboard';
import { Settings } from './pages/Settings';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NotificationProvider } from './contexts/NotificationContext';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <Router>
          <MainLayout>
            <Routes>
              <Route path="/" element={<ContentDiscovery />} />
              <Route path="/fetch" element={<ContentDiscovery />} />
              <Route path="/translate" element={<TranslationWorkspace />} />
              <Route path="/review" element={<ReviewWorkspace />} />
              <Route path="/publish" element={<PublishingDashboard />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </MainLayout>
        </Router>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;