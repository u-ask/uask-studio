import { SurveyBuilder } from "uask-dom";
import test from "tape";
import { libDeleteWorkflow } from "./libdeteleworkflow.js";

test("Add warning delete workflow information to survey parts #333", t => {
  const b = new SurveyBuilder();
  libDeleteWorkflow(b, "deleteWorkflow");
  const parts = b.get();
  const partsVariableNames = ["__INFO_DELETION__"];
  t.true(
    partsVariableNames.every(v => parts.items.find(i => v == i.variableName))
  );
  t.end();
});
