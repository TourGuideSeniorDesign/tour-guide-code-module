import type { TourSlide } from "../types/tour";

export const DEFAULT_BASE_IDENTITY = `You are a tour guide robot for the Electrical and Computer Engineering (ECE) department at Lafayette College, located on the 4th floor of the Acopian Engineering Center. You are friendly, informative, and enthusiastic about engineering education. Keep answers concise — 2-3 sentences unless the visitor asks for more detail. You are physically present with visitors, guiding them through the floor. Do not mention that you are an AI language model.

Your narration for each tour stop will be delivered separately. After the narration finishes, you will be listening for visitor questions. When a visitor speaks, answer their question helpfully. If there is silence or no question, stay quiet and wait — do not repeat the narration or speak unprompted. You are in conversation mode between narrations.`;

function buildFaqBlock(faqSlides: TourSlide[]): string {
  if (faqSlides.length === 0) return "";

  const entries = faqSlides
    .map((s) => `Q: ${s.title}\nA: ${s.spokenText}`)
    .join("\n\n");

  return `\nYou also know the answers to these frequently asked questions. Use them when visitors ask related questions:\n\n${entries}`;
}

function buildStopContext(
  slide: TourSlide,
  stopIndex: number,
  totalStops: number,
): string {
  return `\nYou are currently at tour stop ${stopIndex + 1} of ${totalStops}: "${slide.title}".\nThe narration for this stop is: "${slide.spokenText}"\nIf visitors ask questions, focus on this location and topic, but you can answer general questions about Lafayette and ECE too.`;
}

export function buildSystemPrompt(
  slides: TourSlide[],
  currentIndex: number,
  baseIdentity?: string,
): string {
  const tourStops = slides.filter((s) => !s.id.startsWith("faq-"));
  const faqSlides = slides.filter((s) => s.id.startsWith("faq-"));
  const currentSlide = slides[currentIndex];

  let prompt = baseIdentity?.trim() ? baseIdentity.trim() : DEFAULT_BASE_IDENTITY;
  if (currentSlide) {
    const stopIndexInTour = tourStops.indexOf(currentSlide);
    const effectiveStopIndex =
      stopIndexInTour >= 0 ? stopIndexInTour : currentIndex;
    prompt += buildStopContext(currentSlide, effectiveStopIndex, tourStops.length);
  }
  prompt += buildFaqBlock(faqSlides);

  return prompt;
}

export function buildSlideUpdateMessage(
  slide: TourSlide,
  stopIndex: number,
  totalStops: number,
): string {
  return `The tour has moved to stop ${stopIndex + 1} of ${totalStops}: "${slide.title}". The narration for this stop will be spoken separately. After it finishes, listen for visitor questions about this stop. If no one asks anything, stay quiet. Focus your answers on this location: "${slide.title}".`;
}
