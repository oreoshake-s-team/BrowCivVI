import type { CSSProperties } from "react";
import type { Citation, SourceType } from "@/engine/content/citation";
import type { MediaKind, MediaLink } from "@/engine/content/media";
import styles from "./CitationCard.module.css";

export interface CitationCardProps {
  readonly name: string;
  readonly citation: Citation;
  readonly x: number;
  readonly y: number;
  readonly onClose: () => void;
  readonly onMouseEnter: () => void;
  readonly onMouseLeave: () => void;
  readonly media?: readonly MediaLink[] | undefined;
}

const SOURCE_TYPE_LABELS: Readonly<Record<SourceType, string>> = {
  primary: "Primary source",
  secondary: "Secondary source",
  reference: "Reference",
};

const MEDIA_KIND_LABELS: Readonly<Record<MediaKind, string>> = {
  podcast: "Podcast",
  video: "Video",
  article: "Article",
};

export function CitationCard({
  name,
  citation,
  x,
  y,
  onClose,
  onMouseEnter,
  onMouseLeave,
  media,
}: CitationCardProps) {
  const { claim, source, confidence } = citation;
  const position: CSSProperties = { left: x, top: y };
  return (
    <div
      className={styles.card}
      style={position}
      role="dialog"
      aria-label={`${name} historical reference`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button type="button" className={styles.close} aria-label="Close reference" onClick={onClose}>
        ×
      </button>
      <h3 className={styles.name}>{name}</h3>
      <p className={styles.claim}>{claim}</p>
      {source.url !== undefined ? (
        <a className={styles.source} href={source.url} target="_blank" rel="noopener noreferrer">
          {source.title}
        </a>
      ) : (
        <span className={styles.source}>{source.title}</span>
      )}
      <p className={styles.meta}>
        {SOURCE_TYPE_LABELS[source.type]} · <span className={styles.confidence}>{confidence}</span>{" "}
        confidence
      </p>
      {media !== undefined && media.length > 0 ? (
        <ul className={styles.media}>
          {media.map((item) => (
            <li key={item.id} className={styles.mediaItem}>
              <a
                className={styles.mediaLink}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.mediaKind}>{MEDIA_KIND_LABELS[item.kind]}</span>
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
