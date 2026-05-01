import { Camera } from "lucide-react";
import { useEffect, useRef } from "react";

interface GalleryItem {
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
}

const ITEMS: GalleryItem[] = [
  {
    src: "/gallery-worship.jpg",
    alt: "Fachada da igreja a noite com cruz iluminada e congregacao reunida",
    eyebrow: "Adoração",
    title: "Cultos congregacionais"
  },
  {
    src: "/gallery-prayer.jpg",
    alt: "Irmão em oração usando camiseta com João 1.14",
    eyebrow: "Oração",
    title: "Cultos de oração"
  },
  {
    src: "/gallery-missions.jpg",
    alt: "Evangelismo no Pororoca com violão em visita a uma casa",
    eyebrow: "Missões",
    title: "Evangelismo no sertão"
  },
  {
    src: "/gallery-evangelismo-local.jpg",
    alt: "Grupo da igreja em visita pastoral usando camisetas com Marcos 16:15",
    eyebrow: "Visitas",
    title: "Evangelismo local"
  },
  {
    src: "/gallery-community.jpg",
    alt: "Membros da igreja em abraço em frente ao templo",
    eyebrow: "Comunidade",
    title: "Vida em família"
  },
  {
    src: "/gallery-lado-a-lado.jpg",
    alt: "Pai e filha abraçados após a corrida da igreja",
    eyebrow: "Comunhão",
    title: "Lado a lado"
  },
  {
    src: "/gallery-fellowship.jpg",
    alt: "Grupo da corrida do Dia dos Pais reunido em frente à fachada da igreja",
    eyebrow: "Confraternização",
    title: "Encontros e celebrações"
  }
];

const AUTOSCROLL_PX_PER_FRAME = 1.2;
const RESUME_DELAY_MS = 2400;

export default function Gallery() {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    let position = strip.scrollLeft;

    const getWrapPoint = () => {
      const cards = strip.querySelectorAll<HTMLElement>(".gallery-card");
      const first = cards[0];
      const second = cards[ITEMS.length];
      return first && second ? second.offsetLeft - first.offsetLeft : 0;
    };

    const tick = () => {
      if (!pausedRef.current) {
        const wrap = getWrapPoint();
        if (wrap > 0) {
          position += AUTOSCROLL_PX_PER_FRAME;
          while (position >= wrap) position -= wrap;
          while (position < 0) position += wrap;
          strip.scrollLeft = position;
        }
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const pause = () => {
      pausedRef.current = true;
      if (pauseTimeoutRef.current) window.clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = window.setTimeout(() => {
        position = strip.scrollLeft;
        pausedRef.current = false;
      }, RESUME_DELAY_MS);
    };

    let dragging = false;
    let dragStartX = 0;
    let dragStartScroll = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        dragging = true;
        dragStartX = e.clientX;
        dragStartScroll = strip.scrollLeft;
        strip.setPointerCapture(e.pointerId);
        strip.classList.add("is-dragging");
      }
      pause();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      strip.scrollLeft = dragStartScroll - (e.clientX - dragStartX);
    };

    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      strip.classList.remove("is-dragging");
      position = strip.scrollLeft;
    };

    const onScroll = () => {
      const wrap = getWrapPoint();
      if (wrap <= 0) return;
      if (strip.scrollLeft >= wrap) {
        const next = strip.scrollLeft - wrap;
        strip.scrollLeft = next;
        position = next;
      }
    };

    strip.addEventListener("scroll", onScroll, { passive: true });
    strip.addEventListener("touchstart", pause, { passive: true });
    strip.addEventListener("touchmove", pause, { passive: true });
    strip.addEventListener("wheel", pause, { passive: true });
    strip.addEventListener("pointerdown", onPointerDown);
    strip.addEventListener("pointermove", onPointerMove);
    strip.addEventListener("pointerup", onPointerUp);
    strip.addEventListener("pointercancel", onPointerUp);

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      if (pauseTimeoutRef.current) window.clearTimeout(pauseTimeoutRef.current);
      strip.removeEventListener("scroll", onScroll);
      strip.removeEventListener("touchstart", pause);
      strip.removeEventListener("touchmove", pause);
      strip.removeEventListener("wheel", pause);
      strip.removeEventListener("pointerdown", onPointerDown);
      strip.removeEventListener("pointermove", onPointerMove);
      strip.removeEventListener("pointerup", onPointerUp);
      strip.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return (
    <section className="gallery-section" aria-label="Vida da igreja">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Quem somos</p>
          <h2>Vida da igreja</h2>
        </div>
        <Camera />
      </div>
      <div className="gallery-strip" role="list" ref={stripRef}>
        {[...ITEMS, ...ITEMS].map((item, index) => (
          <figure
            className="gallery-card"
            key={`${item.src}-${index}`}
            role="listitem"
            aria-hidden={index >= ITEMS.length}
          >
            <img src={item.src} alt={item.alt} loading="lazy" draggable={false} />
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
