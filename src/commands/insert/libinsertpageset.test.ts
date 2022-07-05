import { SurveyBuilder } from "uask-dom";
import test from "tape";
import { libInsertPageSet } from "./libinsertpageset.js";

test("Insert pageset librairy #249", t => {
  const b = new SurveyBuilder();
  libInsertPageSet(b, "insertPageSet");
  const parts = b.get();
  const partsVariableNames = ["__PAGE_SET_CODE__"];
  t.true(
    partsVariableNames.every(v => parts.items.find(i => v == i.variableName))
  );
  t.end();
});
