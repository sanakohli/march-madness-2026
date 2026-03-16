import { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Bracket from './components/Bracket';
import Compare from './components/Compare';
import Regions from './components/Regions';
import Simulate from './components/Simulate';
import * as menData from './data/teams';
import * as womenData from './data/wteams';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [gender, setGender] = useState('men');

  const bracketData = gender === 'men' ? menData : womenData;

  return (
    <div className="min-h-screen bg-court-950">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        gender={gender}
        setGender={setGender}
      />
      <main className="pb-12">
        {activeTab === 'dashboard' && <Dashboard bracketData={bracketData} />}
        {activeTab === 'bracket'   && <Bracket   bracketData={bracketData} />}
        {activeTab === 'compare'   && <Compare   bracketData={bracketData} />}
        {activeTab === 'regions'   && <Regions   bracketData={bracketData} />}
        {activeTab === 'simulate'  && <Simulate  bracketData={bracketData} />}
      </main>
    </div>
  );
}
