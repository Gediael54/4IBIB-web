import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export interface PageShellCrumb {
  href: string;
  label: string;
}

export interface PageShellProps {
  eyebrow?: string;
  title: string;
  lead?: string;
  back?: { href: string; label: string };
  breadcrumb?: PageShellCrumb[];
  children: ReactNode;
}

export default function PageShell({ eyebrow, title, lead, back, breadcrumb, children }: PageShellProps) {
  const backTarget = back ?? { href: "#inicio", label: "Voltar" };

  return (
    <main className="page-shell">
      <a className="skip-link" href="#page-shell-content">
        Pular para o conteúdo
      </a>
      <header className="page-shell-topbar" aria-label="Navegação da página">
        <a className="page-shell-back" href={backTarget.href}>
          <ArrowLeft size={20} aria-hidden="true" />
          <span>{backTarget.label}</span>
        </a>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="page-shell-crumbs" aria-label="Caminho">
            {breadcrumb.map((crumb, index) => (
              <span key={`${crumb.href}-${index}`} className="page-shell-crumb">
                {index > 0 && (
                  <span className="page-shell-crumb-sep" aria-hidden="true">
                    {" "}
                    ›{" "}
                  </span>
                )}
                {index < breadcrumb.length - 1 ? (
                  <a href={crumb.href}>{crumb.label}</a>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
      </header>

      <div className="page-shell-body" id="page-shell-content">
        <header className="page-shell-header">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {lead && <p className="page-shell-lead">{lead}</p>}
        </header>
        <div className="page-shell-content">{children}</div>
      </div>
    </main>
  );
}
