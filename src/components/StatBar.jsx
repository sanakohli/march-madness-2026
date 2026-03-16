export default function StatBar({ label, value, max, color = 'bg-hoop-500', suffix = '' }) {
  const pct = Math.min(100, Math.max(0, ((value - (max * 0.5)) / (max * 0.5)) * 100));
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span className="text-white font-medium">{value}{suffix}</span>
      </div>
      <div className="h-1.5 bg-court-700 rounded-full">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
