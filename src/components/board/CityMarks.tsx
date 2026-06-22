import type { CityAllegiance } from "./cityMarkers";
import { starPoints } from "./cityMarkers";

const SETTLEMENT_PATH =
  "M3 21 L3 12 L6 12 L6 9 L9 9 L9 12 L10 12 L10 5 L14 5 L14 12 L15 12 L15 9 L18 9 L18 12 L21 12 L21 21 Z";

export function SettlementShape() {
  return <path d={SETTLEMENT_PATH} fill="currentColor" />;
}

export function CitySigilShape({ allegiance }: { allegiance: CityAllegiance }) {
  if (allegiance === "macedon") {
    return (
      <>
        <polygon points={starPoints(12, 12, 11, 4.5, 16)} fill="currentColor" />
        <circle cx={12} cy={12} r={2.4} fill="currentColor" />
      </>
    );
  }
  if (allegiance === "persia") {
    return (
      <>
        <circle cx={12} cy={11} r={3} fill="currentColor" />
        <rect x={15} y={9.4} width={7} height={1.5} fill="currentColor" />
        <rect x={15.5} y={11.3} width={5.5} height={1.5} fill="currentColor" />
        <rect x={16} y={13.2} width={4} height={1.5} fill="currentColor" />
        <rect x={2} y={9.4} width={7} height={1.5} fill="currentColor" />
        <rect x={3} y={11.3} width={5.5} height={1.5} fill="currentColor" />
        <rect x={4} y={13.2} width={4} height={1.5} fill="currentColor" />
        <rect x={10.5} y={14} width={3} height={4} fill="currentColor" />
      </>
    );
  }
  return (
    <>
      <rect x={5} y={9} width={3} height={11} fill="currentColor" />
      <rect x={16} y={9} width={3} height={11} fill="currentColor" />
      <path d="M4 9 Q12 2 20 9 L20 11.4 Q12 4.8 4 11.4 Z" fill="currentColor" />
    </>
  );
}
