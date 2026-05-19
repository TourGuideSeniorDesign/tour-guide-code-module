export interface TourMedia {
  type: "image" | "video";
  url: string;
  alt?: string;
}

export interface TourSegment {
  displayText: string;
  spokenText: string;
  media: TourMedia[];
}

export interface TourSlide {
  id: string;
  title: string;
  displayText: string;
  spokenText: string;
  media: TourMedia[];
  /**
   * "slideshow" cycles through images; "split" shows two side-by-side;
   * "segments" pairs text blocks with media — image swaps when narration
   * reaches the next segment. Defaults to "slideshow".
   */
  mediaLayout?: "slideshow" | "split" | "segments";
  /** Required when mediaLayout is "segments". Each segment has its own text, speech, and media. */
  segments?: TourSegment[];
}

export interface TourData {
  tourName: string;
  systemPrompt?: string;
  slides: TourSlide[];
}
