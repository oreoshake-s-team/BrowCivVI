import { CITY_MARKER_VIEWBOX, CITY_SETTLEMENT_ID, sigilId } from "./cityMarkers";
import { CitySigilShape, SettlementShape } from "./CityMarks";

export function CityMarkerDefs() {
  return (
    <defs>
      <symbol id={CITY_SETTLEMENT_ID} viewBox={CITY_MARKER_VIEWBOX}>
        <SettlementShape />
      </symbol>
      <symbol id={sigilId("macedon")} viewBox={CITY_MARKER_VIEWBOX}>
        <CitySigilShape allegiance="macedon" />
      </symbol>
      <symbol id={sigilId("persia")} viewBox={CITY_MARKER_VIEWBOX}>
        <CitySigilShape allegiance="persia" />
      </symbol>
      <symbol id={sigilId("neutral")} viewBox={CITY_MARKER_VIEWBOX}>
        <CitySigilShape allegiance="neutral" />
      </symbol>
    </defs>
  );
}
