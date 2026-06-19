import type { Hex } from "../hex";
import type { Citation } from "./citation";
import type { MediaLink } from "./media";

export type FeatureKind = "region" | "sea" | "strait" | "river" | "mountain" | "island";

export interface NamedRegion {
  readonly id: string;
  readonly name: string;
  readonly kind: FeatureKind;
  readonly citation: Citation;
  readonly labelHex?: Hex;
  readonly firstAttestedBce?: number;
  readonly media?: readonly MediaLink[];
}
