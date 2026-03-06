import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import type { Collaboration } from "../types/collaboration";

export type CollabListItemModel = Pick<
  Collaboration,
  "id" | "title" | "description" | "tags" | "files" | "thumbnailUrl" | "mediaDefaultY" | "mediaMinY" | "mediaMaxY"
>;

interface CollabListItemProps {
  collab: CollabListItemModel;
  meta: ReactNode;
  topRight?: ReactNode;
  roles?: ReactNode;
  actions?: ReactNode;
  footerTags?: string[];
  clickable?: boolean;
  onOpen?: () => void;
  ariaLabel?: string;
  className?: string;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest("a, button, input, textarea, select, label");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export default function CollabListItem({
  collab,
  meta,
  topRight,
  roles,
  actions,
  footerTags,
  clickable = false,
  onOpen,
  ariaLabel,
  className,
}: CollabListItemProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const currentY = useRef(0.5);
  const targetY = useRef(0.5);
  const hovering = useRef(false);
  const frameRef = useRef<number | null>(null);
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const coverImage = collab.thumbnailUrl || collab.files.find((file) => file.type.startsWith("image/"))?.url;
  const imageLoaded = !!coverImage && loadedImageUrl === coverImage;
  const rawMinY = clamp(asNumber(collab.mediaMinY, 14), 0, 100);
  const rawMaxY = clamp(asNumber(collab.mediaMaxY, 86), 0, 100);
  const minY = Math.min(rawMinY, rawMaxY);
  const maxY = Math.max(rawMinY, rawMaxY);
  const defaultY = clamp(asNumber(collab.mediaDefaultY, 50), minY, maxY);
  const minRatio = minY / 100;
  const maxRatio = maxY / 100;
  const defaultRatio = defaultY / 100;

  useEffect(() => {
    const node = cardRef.current;
    currentY.current = defaultRatio;
    targetY.current = defaultRatio;
    if (node) {
      node.style.setProperty("--collab-media-pos-y", `${defaultY}%`);
    }
  }, [coverImage, defaultRatio, defaultY]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const animate = () => {
    const node = cardRef.current;
    if (!node) {
      frameRef.current = null;
      return;
    }

    const easing = hovering.current ? 0.16 : 0.05;
    currentY.current += (targetY.current - currentY.current) * easing;
    node.style.setProperty("--collab-media-pos-y", `${(currentY.current * 100).toFixed(2)}%`);

    if (Math.abs(targetY.current - currentY.current) < 0.001) {
      currentY.current = targetY.current;
      node.style.setProperty("--collab-media-pos-y", `${(currentY.current * 100).toFixed(2)}%`);
      frameRef.current = null;
      return;
    }

    frameRef.current = requestAnimationFrame(animate);
  };

  const ensureAnimation = () => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(animate);
  };

  const handleMouseMove = (event: MouseEvent<HTMLElement>) => {
    if (!coverImage) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.height <= 0) return;

    const yRatio = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    targetY.current = minRatio + yRatio * (maxRatio - minRatio);
    ensureAnimation();
  };

  const handleMouseEnter = () => {
    if (!coverImage) return;
    hovering.current = true;
    ensureAnimation();
  };

  const handleMouseLeave = () => {
    hovering.current = false;
    targetY.current = defaultRatio;
    ensureAnimation();
  };

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (!clickable || !onOpen || isInteractiveTarget(event.target)) return;
    onOpen();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!clickable || !onOpen || isInteractiveTarget(event.target)) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  const articleClass = [
    "collab-card",
    "collab-card-with-media",
    clickable ? "clickable" : "",
    coverImage ? "has-image" : "no-image",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      ref={(node) => {
        cardRef.current = node;
      }}
      className={articleClass}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? ariaLabel : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="collab-header">
        <div className="collab-author">
          <div className="collab-meta">{meta}</div>
        </div>
        {topRight}
      </div>

      <div className="collab-title">{collab.title}</div>
      {collab.description && <div className="collab-desc">{collab.description}</div>}

      {roles}

      {footerTags && footerTags.length > 0 && (
        <div className="tags">
          {footerTags.map((tag) => (
            <span className="tag neutral" key={`${collab.id}-${tag}`}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {actions}

      <div className="collab-card-media" aria-hidden="true">
        {coverImage ? (
          <img
            className={imageLoaded ? "is-loaded" : "is-loading"}
            src={coverImage}
            alt=""
            loading="lazy"
            decoding="async"
            ref={(node) => {
              if (!node || !coverImage) return;
              if (node.complete && node.naturalWidth > 0 && loadedImageUrl !== coverImage) {
                setLoadedImageUrl(coverImage);
              }
            }}
            onLoad={() => setLoadedImageUrl(coverImage)}
            onError={() => setLoadedImageUrl(null)}
          />
        ) : (
          <div className="collab-card-media-placeholder" />
        )}
      </div>
    </article>
  );
}
