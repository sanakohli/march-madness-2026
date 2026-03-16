export default function Header({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'bracket',   label: 'My Bracket' },
    { id: 'compare',   label: 'Compare' },
    { id: 'regions',   label: 'Regions' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-court-950/95 backdrop-blur border-b border-court-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-6 h-14">
          <div className="flex items-center gap-2 mr-4">
            <span className="text-2xl">🏀</span>
            <div>
              <p className="text-white font-bold text-sm leading-tight">March Madness 2026</p>
              <p className="text-hoop-400 text-xs leading-tight">Bracket Dashboard</p>
            </div>
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
          <div className="ml-auto">
            <span className="text-xs text-slate-500 bg-court-800 px-2 py-1 rounded border border-court-600">
              Sample data — update after Selection Sunday
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
