import { Menu } from "lucide-react";
import type { ReactNode } from "react";

interface MobileTopbarProps {
  title: string;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  action?: ReactNode;
}

export function MobileTopbar(props: MobileTopbarProps) {
  return (
    <header className="mobile-topbar" role="banner">
      <button
        type="button"
        className="mobile-topbar-menu"
        aria-label="Abrir menu"
        aria-expanded={props.drawerOpen}
        aria-controls="admin-sidebar"
        onClick={props.onToggleDrawer}
      >
        <Menu size={22} />
      </button>
      <h1 className="mobile-topbar-title">{props.title}</h1>
      <div className="mobile-topbar-action">{props.action}</div>
    </header>
  );
}
