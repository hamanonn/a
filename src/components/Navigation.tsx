import React from 'react';
import { Home, Scan, History } from 'lucide-react';

interface NavigationProps {
  setCurrentView: (view: 'dashboard' | 'history' | 'scanner') => void;
  currentView: 'dashboard' | 'history' | 'scanner';
}

const Navigation: React.FC<NavigationProps> = ({ setCurrentView, currentView }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center justify-center w-1/3 text-sm font-medium transition-colors ${
            currentView === 'dashboard' ? 'text-green-600' : 'text-gray-500 hover:text-green-600'
          }`}
        >
          <Home
            className={`w-6 h-6 mb-1 transition-transform ${
              currentView === 'dashboard' ? 'scale-110' : ''
            }`}
          />
          <span className="sr-only">ホーム</span>
          <span className={`${currentView === 'dashboard' ? 'font-bold' : ''}`}>ホーム</span>
        </button>

        <button
          onClick={() => setCurrentView('scanner')}
          className={`flex flex-col items-center justify-center w-1/3 text-sm font-medium transition-colors ${
            currentView === 'scanner' ? 'text-green-600' : 'text-gray-500 hover:text-green-600'
          }`}
        >
          <Scan
            className={`w-6 h-6 mb-1 transition-transform ${
              currentView === 'scanner' ? 'scale-110' : ''
            }`}
          />
          <span className="sr-only">スキャン</span>
          <span className={`${currentView === 'scanner' ? 'font-bold' : ''}`}>スキャン</span>
        </button>

        <button
          onClick={() => setCurrentView('history')}
          className={`flex flex-col items-center justify-center w-1/3 text-sm font-medium transition-colors ${
            currentView === 'history' ? 'text-green-600' : 'text-gray-500 hover:text-green-600'
          }`}
        >
          <History
            className={`w-6 h-6 mb-1 transition-transform ${
              currentView === 'history' ? 'scale-110' : ''
            }`}
          />
          <span className="sr-only">履歴</span>
          <span className={`${currentView === 'history' ? 'font-bold' : ''}`}>履歴</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;