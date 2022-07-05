import { SurveyBuilder } from "uask-dom";
import test from "tape";
import { libOrderItem } from "./liborderitem.js";

test("Add apply item to survey parts", t => {
  const b = new SurveyBuilder();
  libOrderItem(b, "orderItem");
  const parts = b.get();
  t.equal(parts.items[0].variableName, "__ITEM_DIRECTION__");
  t.end();
});
