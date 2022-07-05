import { SurveyBuilder } from "uask-dom";
import test from "tape";
import { libApply } from "./libapply.js";

test("Add apply item to survey parts", t => {
  const b = new SurveyBuilder();
  libApply(b, "apply");
  const parts = b.get();
  t.equal(parts.items[0].variableName, "__APPLY__");
  t.end();
});
