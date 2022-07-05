import { SurveyBuilder } from "uask-dom";
import test from "tape";
import { libInsertPage } from "./libinsertpage.js";

test("Add update page information to survey parts", t => {
  const b = new SurveyBuilder();
  libInsertPage(b, "updateItem");
  const parts = b.get();
  const partsVariableNames = ["__PAGE_CODE__"];
  t.true(
    partsVariableNames.every(v => parts.items.find(i => v == i.variableName))
  );
  t.end();
});
