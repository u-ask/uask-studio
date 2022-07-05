import { SurveyBuilder } from "uask-dom";
import test from "tape";
import { libDeletePageSet } from "./libdeletepageset.js";

test("Add delete items to survey", t => {
  const b = new SurveyBuilder();
  libDeletePageSet(b, "delete");
  const parts = b.get();
  t.equal(parts.items[0].variableName, "__INFO_DELETION__");
  t.end();
});
