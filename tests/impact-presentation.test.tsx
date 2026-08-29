import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ImpactBreakdown } from "../src/components/common/impact-breakdown";

describe("impact presentation", () => {
  test("does not invent a material-flow percentage when no outcome exists", () => {
    const markup = renderToStaticMarkup(
      <ImpactBreakdown
        rescuedGrams={0}
        recoveredGrams={0}
        residualGrams={0}
        inProgressGrams={0}
      />,
    );

    expect(markup).toContain("Belum ada material yang tercatat.");
    expect(markup).not.toContain("NaN");
  });
});
