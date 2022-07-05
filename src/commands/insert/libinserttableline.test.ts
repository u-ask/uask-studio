import { SurveyBuilder } from "uask-dom";
import test from "tape";
import { libInsertTableLine } from "./libinserttableline.js";

test("Add insert item to survey parts", t => {
  const b = new SurveyBuilder();
  libInsertTableLine(b, "insert");
  const parts = b.get();
  const partsVariableNames = [
    "__COLUMN_NAMES__",
    "__LINE_NAME__",
    "__LINE_POSITION__",
  ];
  t.true(
    partsVariableNames.every(v => parts.items.find(i => v == i.variableName))
  );
  t.end();
});
