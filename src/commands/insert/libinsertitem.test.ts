import { SurveyBuilder } from "uask-dom";
import test from "tape";
import { libInsertItem } from "./libinsertitem.js";

test("Add insert item to survey parts", t => {
  const b = new SurveyBuilder();
  libInsertItem(b, "insert");
  const parts = b.get();
  t.equal(parts.items[0].variableName, "__ITEM_VARIABLE_NAME__");
  t.end();
});
