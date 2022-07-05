import { SurveyBuilder } from "uask-dom";
import test from "tape";
import { libUpdatePage } from "./libupdatepage.js";

test("Add update page information to survey parts", t => {
  const b = new SurveyBuilder();
  libUpdatePage(b, "updateItem");
  const parts = b.get();
  const partsVariableNames = ["__PAGE_NAME__"];
  t.true(
    partsVariableNames.every(v => parts.items.find(i => v == i.variableName))
  );
  t.end();
});
