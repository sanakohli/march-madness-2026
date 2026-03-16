export default function Header({ activeTab, setActiveTab, gender, setGender }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'bracket',   label: 'My Bracket' },
    { id: 'compare',   label: 'Compare' },
    { id: 'regions',   label: 'Regions' },
    { id: 'simulate',  label: 'Simulate' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-court-950/95 backdrop-blur border-b border-court-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-4 h-14">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏀</span>
            <div>
              <p className="text-white font-bold text-sm leading-tight">March Madness 2026</p>
              <p className="text-hoop-400 text-xs leading-tight">Bracket Dashboard</p>
            </div>
          </div>

          {/* Men / Women toggle */}
          <div className="flex bg-court-800 border border-court-600 rounded-lg p-0.5 ml-2">
            {['men', 'women'].map(g => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors capitalize ${
                  gender === g
                    ? 'bg-hoop-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {g === 'men' ? "Men's" : "Women's"}
              </button>
            ))}
          </div>

          <nav className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-hoop-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-court-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
