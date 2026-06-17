import type { QuizQuestion } from "./scoring";

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "control-roles",
    prompt: "Clear roles can make exploration feel calmer and more focused for me.",
    dimension: "control",
  },
  {
    id: "control-guidance",
    prompt: "I am curious about giving or receiving confident guidance by agreement.",
    dimension: "control",
  },
  {
    id: "control-boundaries",
    prompt: "Negotiated limits make control dynamics easier for me to consider.",
    dimension: "control",
    weight: 1.2,
  },
  {
    id: "control-switching",
    prompt: "I may enjoy changing who leads depending on mood, trust, and context.",
    dimension: "control",
  },
  {
    id: "sensation-contrast",
    prompt: "Strong sensory contrast sounds interesting when it is discussed first.",
    dimension: "sensation",
  },
  {
    id: "sensation-texture",
    prompt: "Texture, temperature, sound, or rhythm can shape my curiosity.",
    dimension: "sensation",
  },
  {
    id: "sensation-intensity",
    prompt: "I like the idea of gradually testing intensity with clear check-ins.",
    dimension: "sensation",
    weight: 1.2,
  },
  {
    id: "sensation-calm",
    prompt: "Quiet, subtle sensations can be just as appealing to me as bold ones.",
    dimension: "sensation",
  },
  {
    id: "structure-planning",
    prompt: "A simple plan helps me feel more confident before trying something new.",
    dimension: "structure",
  },
  {
    id: "structure-rules",
    prompt: "Shared rules or rituals can make an experience feel more meaningful.",
    dimension: "structure",
  },
  {
    id: "structure-language",
    prompt: "I value having agreed words for yes, no, slow down, and pause.",
    dimension: "structure",
    weight: 1.2,
  },
  {
    id: "structure-reflection",
    prompt: "I prefer to reflect afterward so future exploration gets clearer.",
    dimension: "structure",
  },
  {
    id: "imagination-story",
    prompt: "Stories, roles, or scenarios can help me understand what I want.",
    dimension: "imagination",
  },
  {
    id: "imagination-play",
    prompt: "Playful framing makes adult exploration feel less intimidating.",
    dimension: "imagination",
  },
  {
    id: "imagination-novelty",
    prompt: "Novel ideas appeal to me when they still fit my values and limits.",
    dimension: "imagination",
    weight: 1.2,
  },
  {
    id: "imagination-private",
    prompt: "Some fantasies are useful as private self-knowledge even if I never act on them.",
    dimension: "imagination",
  },
  {
    id: "visibility-expression",
    prompt: "Style, presentation, or being admired can be part of what feels exciting.",
    dimension: "visibility",
  },
  {
    id: "visibility-praise",
    prompt: "Praise or being noticed can feel meaningful when it is welcome.",
    dimension: "visibility",
  },
  {
    id: "visibility-privacy",
    prompt: "I like choosing carefully what remains private and what is shared.",
    dimension: "visibility",
    weight: 1.2,
  },
  {
    id: "visibility-aesthetic",
    prompt: "Aesthetic details can change how confident or expressive I feel.",
    dimension: "visibility",
  },
  {
    id: "care-aftercare",
    prompt: "Reassurance afterward matters to how positive an experience feels.",
    dimension: "care",
    weight: 1.2,
  },
  {
    id: "care-trust",
    prompt: "Trust and emotional safety are central to my curiosity.",
    dimension: "care",
  },
  {
    id: "care-checkins",
    prompt: "Regular check-ins help me stay present and comfortable.",
    dimension: "care",
  },
  {
    id: "care-repair",
    prompt: "I want space to talk kindly if something does not feel right.",
    dimension: "care",
  },
];
