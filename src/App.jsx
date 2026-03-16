import { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Bracket from './components/Bracket';
import Compare from './components/Compare';
import Regions from './components/Regions';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-court-950">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="pb-12">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'bracket'   && <Bracket />}
        {activeTab === 'compare'   && <Compare />}
        {activeTab === 'regions'   && <Regions />}
      </main>
    </div>
  );
}
