import { usePlanner } from '../../context/PlannerContext'

export function CategoryLegend() {
  const { store } = usePlanner()
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {store.categories.map((cat) => (
        <div key={cat.id} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            title={cat.label}
            aria-label={cat.label}
            style={{ background: cat.bgColor, border: `1px solid ${cat.color}` }}
          />
          <span className="text-xs font-semibold tracking-wide" style={{ color: cat.color }}>
            {cat.label}
          </span>
        </div>
      ))}
      {store.categories.length === 0 && (
        <span className="text-xs text-slate-600 italic">No categories defined — add them in Settings</span>
      )}
    </div>
  )
}
