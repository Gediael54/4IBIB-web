import { Camera } from "lucide-react";

interface GalleryItem {
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
}

const ITEMS: GalleryItem[] = [
  {
    src: "/gallery-worship.jpg",
    alt: "Congregacao em adoracao no templo",
    eyebrow: "Adoracao",
    title: "Cultos congregacionais"
  },
  {
    src: "/gallery-prayer.jpg",
    alt: "Momento de oracao com a congregacao",
    eyebrow: "Oracao",
    title: "Cultos de oracao"
  },
  {
    src: "/gallery-missions.jpg",
    alt: "Trabalho de evangelismo no sertao",
    eyebrow: "Missoes",
    title: "Evangelismo no sertao"
  },
  {
    src: "/gallery-community.jpg",
    alt: "Igreja reunida em frente ao templo",
    eyebrow: "Comunidade",
    title: "Vida em familia"
  },
  {
    src: "/gallery-fellowship.jpg",
    alt: "Reuniao de senhoras da igreja",
    eyebrow: "Comunhao",
    title: "Encontros e celebracoes"
  }
];

export default function Gallery() {
  return (
    <section className="gallery-section" aria-label="Vida da igreja">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Quem somos</p>
          <h2>Vida da igreja</h2>
        </div>
        <Camera />
      </div>
      <div className="gallery-strip" role="list">
        {ITEMS.map((item) => (
          <figure className="gallery-card" key={item.src} role="listitem">
            <img src={item.src} alt={item.alt} loading="lazy" />
            <figcaption className="gallery-card-overlay">
              <span className="gallery-card-eyebrow">{item.eyebrow}</span>
              <span className="gallery-card-title">{item.title}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
