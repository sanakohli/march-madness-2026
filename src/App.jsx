import { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Bracket from './components/Bracket';
import Compare from './components/Compare';
import Regions from './components/Regions';
import Simulate from './components/Simulate';
import Tracker from './components/Tracker';
import * as menData from './data/teams';
import * as womenData from './data/wteams';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [gender, setGender] = useState('men');

  const bracketData = gender === 'men' ? menData : womenData;

  return (
    <div className="min-h-screen bg-court-950 relative">
      {/* Arena ceiling glow — barely visible orange ambient at top */}
      <div
        className="fixed top-0 left-0 right-0 pointer-events-none animate-glow-pulse"
        style={{
          height: '320px',
          background: 'radial-gradient(ellipse 70% 100% at 50% -20%, rgba(249,115,22,0.055) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        gender={gender}
        setGender={setGender}
      />
      <main className="pb-12 relative z-10">
        {activeTab === 'dashboard' && <Dashboard bracketData={bracketData} />}
        {activeTab === 'bracket'   && <Bracket   bracketData={bracketData} />}
        {activeTab === 'compare'   && <Compare   bracketData={bracketData} />}
        {activeTab === 'regions'   && <Regions   bracketData={bracketData} />}
        {activeTab === 'simulate'  && <Simulate  bracketData={bracketData} />}
        {activeTab === 'tracker'   && <Tracker   bracketData={bracketData} gender={gender} />}
      </main>
    </div>
  );
}
