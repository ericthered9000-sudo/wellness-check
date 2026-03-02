import './BottomNav.css';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
}

interface BottomNavProps {
  items: NavItem[];
  activeId: string;
}

export function BottomNav({ items, activeId }: BottomNavProps) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {items.map((item) => (
        <button
          key={item.id}
          className={`bottom-nav-item ${activeId === item.id ? 'active' : ''}`}
          onClick={item.onClick}
          aria-label={item.label}
          aria-current={activeId === item.id ? 'page' : undefined}
        >
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}