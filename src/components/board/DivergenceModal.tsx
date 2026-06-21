"use client";

import { useEffect, useRef, useState } from "react";
import type { DivergenceOptionView, DivergenceView } from "@/app/play/actions";
import styles from "./DivergenceModal.module.css";

export interface DivergenceModalProps {
  readonly node: DivergenceView;
  readonly onResolve: (optionId: string) => void;
}

const FOCUSABLE = 'button, a[href], summary, [tabindex]:not([tabindex="-1"])';

export function DivergenceModal({ node, onResolve }: DivergenceModalProps) {
  const [chosen, setChosen] = useState<DivergenceOptionView | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `divergence-${node.id}-title`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return undefined;
    dialog.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
    };
  }, [chosen]);

  return (
    <div className={styles.backdrop} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className={styles.title}>
          {node.title}
        </h2>
        {chosen === null ? (
          <>
            <p className={styles.prompt}>{node.prompt}</p>
            <p className={styles.advisor}>{node.advisor} counsels:</p>
            <ul className={styles.options}>
              {node.options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className={styles.option}
                    onClick={() => {
                      setChosen(option);
                    }}
                  >
                    <span className={styles.optionLabel}>{option.label}</span>
                    <span className={styles.optionQuote}>{option.quote}</span>
                  </button>
                </li>
              ))}
            </ul>
            <details className={styles.sources}>
              <summary>Historical background</summary>
              <p className={styles.claim}>{node.citation.claim}</p>
              <ul className={styles.media}>
                <li>
                  <a href={node.citation.source.url} target="_blank" rel="noreferrer">
                    {node.citation.source.title}
                  </a>
                </li>
                {node.media.map((link) => (
                  <li key={link.id}>
                    <a href={link.url} target="_blank" rel="noreferrer">
                      {link.title}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : (
          <>
            <p className={styles.outcome}>{chosen.outcome}</p>
            <button
              type="button"
              className={styles.continue}
              onClick={() => {
                onResolve(chosen.id);
              }}
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}
