import type {
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";

export interface CitationTargetProps {
  readonly label: string;
  readonly className?: string | undefined;
  readonly onShow: (target: SVGGElement) => void;
  readonly onHide: () => void;
  readonly children: ReactNode;
}

export function CitationTarget({
  label,
  className,
  onShow,
  onHide,
  children,
}: CitationTargetProps) {
  return (
    <g
      className={className}
      tabIndex={0}
      role="button"
      aria-label={`${label} historical reference`}
      onMouseEnter={(event: ReactMouseEvent<SVGGElement>) => {
        onShow(event.currentTarget);
      }}
      onMouseLeave={onHide}
      onFocus={(event: ReactFocusEvent<SVGGElement>) => {
        onShow(event.currentTarget);
      }}
      onBlur={onHide}
      onClick={(event: ReactMouseEvent<SVGGElement>) => {
        event.stopPropagation();
        onShow(event.currentTarget);
      }}
    >
      {children}
    </g>
  );
}
