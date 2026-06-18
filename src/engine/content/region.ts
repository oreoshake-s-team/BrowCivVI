import type { Hex } from "../hex";
import type { Citation } from "./citation";

export type FeatureKind = "region" | "sea" | "strait" | "river" | "mountain" | "island";

export interface NamedRegion {
  readonly id: string;
  readonly name: string;
  readonly kind: FeatureKind;
  readonly citation: Citation;
  readonly labelHex?: Hex;
  readonly firstAttestedBce?: number;
}
