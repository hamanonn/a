import React, { useState } from 'react';
import Dashboard from './Dashboard';
import ActivityHistory from './ActivityHistory';
import ReceiptScanner from './ReceiptScanner';
import Navigation from './Navigation';
import { useAuth } from '../contexts/AuthContext';
import AuthScreen from './AuthScreen';

const AppContent: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'history' | 'scanner'>('dashboard');

  if (!currentUser || !userProfile) {
    return <AuthScreen />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'scanner':
        return <ReceiptScanner setCurrentView={setCurrentView} />;
      case 'history':
        return <ActivityHistory />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16 pb-20">
        {renderContent()}
      </div>
      <Navigation setCurrentView={setCurrentView} currentView={currentView} />
    </div>
  );
};

export default AppContent;