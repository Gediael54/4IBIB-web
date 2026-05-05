interface PictureSetProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  draggable?: boolean;
}

export default function PictureSet({ src, alt, className, loading = "lazy", draggable }: PictureSetProps) {
  const base = src.replace(/\.jpg$/, "");
  return (
    <picture>
      <source srcSet={`${base}.avif`} type="image/avif" />
      <source srcSet={`${base}.webp`} type="image/webp" />
      <img src={src} alt={alt} className={className} loading={loading} draggable={draggable} />
    </picture>
  );
}
