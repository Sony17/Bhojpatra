/**
 * Reusable pill tab bar (generalised from the VendorDashboard pattern).
 * Controlled — parent owns the active id.
 */
export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function Tabs({ tabs, active, onChange, className = "" }: TabsProps) {
  return (
    <div className={"flex flex-wrap gap-2.5 " + className}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={isActive}
            className={
              "rounded-full px-5 py-2 text-sm font-medium transition-colors " +
              (isActive
                ? "bg-maroon text-cream"
                : "bg-cream-2 text-ink-soft hover:bg-cream-3")
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
