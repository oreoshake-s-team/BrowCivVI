export type MediaKind = "podcast" | "video" | "article";

export interface MediaLink {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly kind: MediaKind;
}
