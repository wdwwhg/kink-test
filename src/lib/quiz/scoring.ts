export type DimensionId =
  | "control"
  | "sensation"
  | "structure"
  | "imagination"
  | "visibility"
  | "care";

export type AnswerValue = 1 | 2 | 3 | 4 | 5;

export type AnswerMap = Record<string, AnswerValue>;

export interface QuizQuestion {
  id: string;
  prompt: string;
  dimension: DimensionId;
  weight?: number;
}

export interface Dimension {
  id: DimensionId;
  label: string;
  description: string;
}

export interface DimensionScore {
  id: DimensionId;
  label: string;
  score: number;
}

export interface QuizResult {
  scores: DimensionScore[];
  topDimensions: DimensionId[];
}

export const DIMENSIONS: Dimension[] = [
  {
    id: "control",
    label: "Control Dynamics",
    description: "How much structure, leadership, or negotiated role clarity feels appealing.",
  },
  {
    id: "sensation",
    label: "Sensation",
    description: "How much sensory contrast, intensity, or physical novelty you may want to discuss.",
  },
  {
    id: "structure",
    label: "Structure",
    description: "How much planning, rules, rituals, and explicit agreements support exploration.",
  },
  {
    id: "imagination",
    label: "Imagination",
    description: "How much fantasy, story, or playful framing helps you understand your interests.",
  },
  {
    id: "visibility",
    label: "Visibility",
    description: "How much being noticed, praised, or aesthetically expressed matters to you.",
  },
  {
    id: "care",
    label: "Care & Connection",
    description: "How much reassurance, aftercare, and emotional safety shape a good experience.",
  },
];

const dimensionOrder = new Map<DimensionId, number>(
  DIMENSIONS.map((dimension, index) => [dimension.id, index]),
);

export function calculateQuizResult(
  questions: QuizQuestion[],
  answers: AnswerMap,
): QuizResult {
  const totals = new Map<DimensionId, { weightedSum: number; weight: number }>(
    DIMENSIONS.map((dimension) => [dimension.id, { weightedSum: 0, weight: 0 }]),
  );

  for (const question of questions) {
    const answer = answers[question.id];

    if (answer === undefined) {
      throw new Error(`Missing answer for question ${question.id}`);
    }

    const weight = question.weight ?? 1;
    const normalized = ((answer - 1) / 4) * 100;
    const total = totals.get(question.dimension);

    if (!total) {
      throw new Error(`Unknown dimension ${question.dimension}`);
    }

    total.weightedSum += normalized * weight;
    total.weight += weight;
  }

  const scores = DIMENSIONS.map((dimension) => {
    const total = totals.get(dimension.id);
    const score =
      total && total.weight > 0 ? Math.round(total.weightedSum / total.weight) : 50;

    return {
      id: dimension.id,
      label: dimension.label,
      score,
    };
  });

  const topDimensions = [...scores]
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (dimensionOrder.get(a.id) ?? 0) - (dimensionOrder.get(b.id) ?? 0);
    })
    .slice(0, 3)
    .map((score) => score.id);

  return {
    scores,
    topDimensions,
  };
}
