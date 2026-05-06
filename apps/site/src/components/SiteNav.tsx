import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, HeartHandshake, Menu, X } from "lucide-react";
import { useChurchProfile } from "../lib/church-context";

const QUEM_SOMOS_ITEMS = [
  { href: "#confissao-de-fe", label: "Confissão de fé" },
  { href: "#lideranca", label: "Liderança" },
  { href: "#primeira-vez", label: "Primeira vez aqui" }
];

const PRIMARY_LINKS = [
  { href: "#programacao", label: "Programação" },
  { href: "#ministerios", label: "Ministérios" },
  { href: "#pregacoes", label: "Pregações" },
  { href: "#doacoes", label: "Doações" }
];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isHomeHash(hash: string): boolean {
  const normalized = hash.replace(/^#/, "");
  return normalized === "" || normalized === "inicio";
}

export default function SiteNav() {
  const church = useChurchProfile();
  const [scrolled, setScrolled] = useState(false);
  const [isHome, setIsHome] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quemSomosExpanded, setQuemSomosExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const burgerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY >= 80);
    }
    function handleHash() {
      setIsHome(isHomeHash(window.location.hash));
    }
    handleScroll();
    handleHash();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("hashchange", handleHash);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("hashchange", handleHash);
    };
  }, []);

  const solid = scrolled || !isHome;

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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function getFocusable(): HTMLElement[] {
      if (!drawerRef.current) return [];
      return Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute("disabled")
      );
    }

    const focusables = getFocusable();
    if (focusables.length > 0) {
      focusables[0].focus();
    } else if (drawerRef.current) {
      drawerRef.current.focus();
    }

    function handleKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || !drawerRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      burgerRef.current?.focus();
    };
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
    <nav className={`site-nav${solid ? " scrolled" : ""}`} aria-label="Navegação principal">
      <a className="brand" href="#inicio" onClick={handleNavigate}>
        <img src="/logo.png" alt="" className="brand-logo" />
        <span>{church.shortName}</span>
      </a>

      <button
        ref={burgerRef}
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
          Início
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
        <HeartHandshake size={16} /> Pedido de oração
      </a>

      {drawerOpen && (
        <div className="site-nav-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <aside
            ref={drawerRef}
            className="site-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            tabIndex={-1}
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
                Início
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
                <HeartHandshake size={16} /> Pedido de oração
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
