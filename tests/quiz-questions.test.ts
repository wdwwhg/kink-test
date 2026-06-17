import { describe, expect, test } from "vitest";
import { DIMENSIONS } from "../src/lib/quiz/scoring";
import { QUIZ_QUESTIONS } from "../src/lib/quiz/questions";

describe("QUIZ_QUESTIONS", () => {
  test("contains 24 questions across the six canonical dimensions", () => {
    expect(QUIZ_QUESTIONS).toHaveLength(24);

    for (const dimension of DIMENSIONS) {
      expect(
        QUIZ_QUESTIONS.filter((question) => question.dimension === dimension.id),
      ).toHaveLength(4);
    }
  });

  test("uses unique question ids", () => {
    const ids = QUIZ_QUESTIONS.map((question) => question.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  test("keeps the questionnaire language non-graphic", () => {
    const explicitTerms = /\b(genitals?|porn|nude|naked|sex acts?)\b/i;

    for (const question of QUIZ_QUESTIONS) {
      expect(question.prompt).not.toMatch(explicitTerms);
    }
  });
});
