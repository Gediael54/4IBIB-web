import { Modal } from "./Modal";

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  description: string;
}

const SHORTCUTS: ShortcutEntry[] = [
  { keys: ["Ctrl", "K"], description: "Abrir busca rapida" },
  { keys: ["Cmd", "K"], description: "Abrir busca rapida (Mac)" },
  { keys: ["?"], description: "Abrir esta ajuda" },
  { keys: ["Esc"], description: "Fechar modal ou busca" },
  { keys: ["Tab"], description: "Navegar pelos campos" },
  { keys: ["Shift", "Tab"], description: "Navegar para tras" }
];

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  return (
    <Modal open={open} onClose={onClose} title="Atalhos de teclado" size="sm">
      <ul className="shortcuts-list">
        {SHORTCUTS.map((entry) => (
          <li key={entry.description} className="shortcuts-item">
            <span className="shortcuts-keys">
              {entry.keys.map((key, index) => (
                <span key={key + index} className="shortcuts-key-group">
                  <kbd className="shortcuts-key">{key}</kbd>
                  {index < entry.keys.length - 1 && <span className="shortcuts-key-sep">+</span>}
                </span>
              ))}
            </span>
            <span className="shortcuts-description">{entry.description}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export default ShortcutsHelp;
