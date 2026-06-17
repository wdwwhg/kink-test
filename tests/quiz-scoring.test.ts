import { describe, expect, test } from "vitest";
import {
  calculateQuizResult,
  DIMENSIONS,
  type AnswerMap,
  type QuizQuestion,
} from "../src/lib/quiz/scoring";

const questions: QuizQuestion[] = [
  {
    id: "control-soft",
    prompt: "I like clear roles when exploring intimacy.",
    dimension: "control",
  },
  {
    id: "control-weighted",
    prompt: "Planned power exchange feels meaningful to me.",
    dimension: "control",
    weight: 2,
  },
  {
    id: "sensation-soft",
    prompt: "I am curious about strong sensory contrast.",
    dimension: "sensation",
  },
  {
    id: "care-soft",
    prompt: "Aftercare and reassurance shape whether exploration feels good.",
    dimension: "care",
  },
];

describe("calculateQuizResult", () => {
  test("returns neutral scores when every answer is neutral", () => {
    const answers: AnswerMap = {
      "control-soft": 3,
      "control-weighted": 3,
      "sensation-soft": 3,
      "care-soft": 3,
    };

    const result = calculateQuizResult(questions, answers);

    expect(result.scores).toEqual(
      DIMENSIONS.map((dimension) => ({
        id: dimension.id,
        label: dimension.label,
        score: 50,
      })),
    );
    expect(result.topDimensions).toEqual(["control", "sensation", "structure"]);
  });

  test("uses question weights when averaging dimension scores", () => {
    const answers: AnswerMap = {
      "control-soft": 1,
      "control-weighted": 5,
      "sensation-soft": 3,
      "care-soft": 3,
    };

    const result = calculateQuizResult(questions, answers);
    const control = result.scores.find((score) => score.id === "control");

    expect(control?.score).toBe(67);
  });

  test("maps lowest and highest answers to the score range", () => {
    const answers: AnswerMap = {
      "control-soft": 5,
      "control-weighted": 5,
      "sensation-soft": 1,
      "care-soft": 3,
    };

    const result = calculateQuizResult(questions, answers);

    expect(result.scores.find((score) => score.id === "control")?.score).toBe(100);
    expect(result.scores.find((score) => score.id === "sensation")?.score).toBe(0);
  });

  test("breaks top-dimension ties by the canonical dimension order", () => {
    const answers: AnswerMap = {
      "control-soft": 5,
      "control-weighted": 5,
      "sensation-soft": 5,
      "care-soft": 5,
    };

    const result = calculateQuizResult(questions, answers);

    expect(result.topDimensions).toEqual(["control", "sensation", "care"]);
  });

  test("throws a helpful error when an answer is missing", () => {
    const answers: AnswerMap = {
      "control-soft": 3,
      "control-weighted": 3,
      "sensation-soft": 3,
    };

    expect(() => calculateQuizResult(questions, answers)).toThrow(
      "Missing answer for question care-soft",
    );
  });
});
