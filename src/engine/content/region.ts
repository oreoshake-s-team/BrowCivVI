import type { Citation } from "./citation";

export type FeatureKind = "region" | "sea" | "strait" | "river" | "mountain";

export interface NamedRegion {
  readonly id: string;
  readonly name: string;
  readonly kind: FeatureKind;
  readonly citation: Citation;
  readonly firstAttestedBce?: number;
}
