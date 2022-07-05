import { SurveyBuilder } from "uask-dom";
import test from "tape";
import { libDeletePage } from "./libdetelepage.js";

test("Add warning delete page information to survey parts #331", t => {
  const b = new SurveyBuilder();
  libDeletePage(b, "deletePage");
  const parts = b.get();
  const partsVariableNames = ["__INFO_DELETION__"];
  t.true(
    partsVariableNames.every(v => parts.items.find(i => v == i.variableName))
  );
  t.end();
});
