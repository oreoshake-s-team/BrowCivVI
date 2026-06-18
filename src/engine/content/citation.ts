export type SourceType = "primary" | "secondary" | "reference";

export interface Source {
  readonly title: string;
  readonly author?: string;
  readonly work?: string;
  readonly url?: string;
  readonly type: SourceType;
}

export type Confidence = "high" | "medium" | "low";

export interface Citation {
  readonly claim: string;
  readonly source: Source;
  readonly confidence: Confidence;
}
