import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, HeartHandshake, Menu, X } from "lucide-react";
import { useChurchProfile } from "../lib/church-context";

const QUEM_SOMOS_ITEMS = [
  { href: "#confissao-de-fe", label: "Confissao de fe" },
  { href: "#lideranca", label: "Lideranca" },
  { href: "#primeira-vez", label: "Primeira vez aqui" }
];

const PRIMARY_LINKS = [
  { href: "#programacao", label: "Programacao" },
  { href: "#ministerios", label: "Ministerios" },
  { href: "#pregacoes", label: "Pregacoes" },
  { href: "#doacoes", label: "Doacoes" }
];

export default function SiteNav() {
  const church = useChurchProfile();
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quemSomosExpanded, setQuemSomosExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY >= 80);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    function handleKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [drawerOpen]);

  function handleNavigate() {
    setDropdownOpen(false);
    setDrawerOpen(false);
    setQuemSomosExpanded(false);
  }

  function handleDropdownKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setDropdownOpen((prev) => !prev);
    }
  }

  return (
    <nav className={`site-nav${scrolled ? " scrolled" : ""}`} aria-label="Navegacao principal">
      <a className="brand" href="#inicio" onClick={handleNavigate}>
        <img src="/logo.png" alt="" className="brand-logo" />
        <span>{church.shortName}</span>
      </a>

      <button
        type="button"
        className="site-nav-burger"
        aria-label="Abrir menu"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
      >
        <Menu size={22} />
      </button>

      <div className="site-nav-links">
        <a href="#inicio" onClick={handleNavigate}>
          Inicio
        </a>
        <div className="site-nav-dropdown" ref={dropdownRef}>
          <button
            type="button"
            className="site-nav-dropdown-trigger"
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
            onClick={() => setDropdownOpen((prev) => !prev)}
            onKeyDown={handleDropdownKey}
          >
            Quem somos <ChevronDown size={14} aria-hidden="true" />
          </button>
          {dropdownOpen && (
            <div className="site-nav-dropdown-menu" role="menu">
              {QUEM_SOMOS_ITEMS.map((item) => (
                <a key={item.href} href={item.href} role="menuitem" onClick={handleNavigate}>
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>
        {PRIMARY_LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={handleNavigate}>
            {link.label}
          </a>
        ))}
        <a href="/admin" className="site-nav-admin">
          Admin
        </a>
      </div>

      <a href="#contato" className="site-nav-cta button primary" onClick={handleNavigate}>
        <HeartHandshake size={16} /> Pedido de oracao
      </a>

      {drawerOpen && (
        <div className="site-nav-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <aside
            className="site-nav-drawer"
            role="dialog"
            aria-label="Menu de navegacao"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="site-nav-drawer-header">
              <span>Menu</span>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setDrawerOpen(false)}
                className="site-nav-drawer-close"
              >
                <X size={20} />
              </button>
            </header>
            <div className="site-nav-drawer-links">
              <a href="#inicio" onClick={handleNavigate}>
                Inicio
              </a>
              <button
                type="button"
                className="site-nav-drawer-group"
                aria-expanded={quemSomosExpanded}
                onClick={() => setQuemSomosExpanded((prev) => !prev)}
              >
                Quem somos
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              {quemSomosExpanded && (
                <div className="site-nav-drawer-sublist">
                  {QUEM_SOMOS_ITEMS.map((item) => (
                    <a key={item.href} href={item.href} onClick={handleNavigate}>
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
              {PRIMARY_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={handleNavigate}>
                  {link.label}
                </a>
              ))}
              <a href="#contato" onClick={handleNavigate} className="site-nav-drawer-cta">
                <HeartHandshake size={16} /> Pedido de oracao
              </a>
              <a href="/admin" className="site-nav-admin" onClick={handleNavigate}>
                Admin
              </a>
            </div>
          </aside>
        </div>
      )}
    </nav>
  );
}
