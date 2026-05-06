interface BrandLoaderProps {
  label?: string;
  inline?: boolean;
}

export default function BrandLoader({ label = "Carregando...", inline = false }: BrandLoaderProps) {
  const className = inline ? "brand-loader brand-loader-inline" : "brand-loader";
  return (
    <div className={className} role="status" aria-live="polite">
      <span className="brand-loader-orb">
        <img src="/logo.png" alt="" className="brand-loader-logo" />
        <span className="brand-loader-ring" aria-hidden="true" />
      </span>
      <span className="brand-loader-label">{label}</span>
    </div>
  );
}
