export default function Header({ activeTab, setActiveTab, gender, setGender }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'bracket',   label: 'My Bracket' },
    { id: 'compare',   label: 'Compare' },
    { id: 'regions',   label: 'Regions' },
    { id: 'simulate',  label: 'Simulate' },
    { id: 'tracker',   label: 'Live Tracker' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-court-950/96 backdrop-blur-md border-b border-court-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-14 gap-3">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-md bg-hoop-500/15 border border-hoop-500/30 flex items-center justify-center shrink-0">
              <span className="text-sm leading-none">🏀</span>
            </div>
            <div>
              <p className="font-sport text-white text-base uppercase tracking-wider leading-tight" style={{ letterSpacing: '0.06em' }}>
                March Madness
              </p>
              <p className="text-hoop-400 text-xs leading-tight font-mono tracking-widest" style={{ fontSize: '9px', letterSpacing: '0.15em' }}>
                2026 · BRACKET DASHBOARD
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-court-600 mx-2 shrink-0" />

          {/* Men / Women toggle */}
          <div className="flex bg-court-800 border border-court-600 rounded-lg p-0.5 shrink-0">
            {['men', 'women'].map(g => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`px-3 py-1 rounded transition-all text-xs font-sport uppercase tracking-wider ${
                  gender === g
                    ? 'bg-hoop-500 text-white glow-hoop'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                style={{ letterSpacing: '0.08em' }}
              >
                {g === 'men' ? "Men's" : "Women's"}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-court-600 mx-2 shrink-0" />

          {/* Nav tabs */}
          <nav className="flex h-full">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 transition-colors h-full flex items-center font-sport uppercase text-xs ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                style={{ letterSpacing: '0.08em' }}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-hoop-500 rounded-full" />
                )}
              </button>
            ))}
          </nav>

        </div>
      </div>
    </header>
  );
}
