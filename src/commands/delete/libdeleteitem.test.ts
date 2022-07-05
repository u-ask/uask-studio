import { SurveyBuilder } from "uask-dom";
import test from "tape";
import { libDeleteItem } from "./libdeleteitem.js";

test("Add warning delete page information to survey parts #331", t => {
  const b = new SurveyBuilder();
  libDeleteItem(b, "deletePage");
  const parts = b.get();
  const partsVariableNames = ["__INFO_DELETION__"];
  t.true(
    partsVariableNames.every(v => parts.items.find(i => v == i.variableName))
  );
  t.end();
});
