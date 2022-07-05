import { ChoiceType, SurveyBuilder } from "uask-dom";
import test from "tape";
import { libUpdatePageSet } from "./libupdatepageset.js";

test("Add update pageSet information", t => {
  const survey = buildTestSurvey();
  const b = new SurveyBuilder();
  libUpdatePageSet(b, "updatePageSet", survey);
  const parts = b.get();
  t.equal(parts.items[0].variableName, "__PAGE_SET_NAME__");
  t.equal(parts.items[1].variableName, "__PAGE_SET_DATEVAR__");
  t.equal(parts.items[2].variableName, "__PAGE_SET_PAGES__");
  t.deepEqual((parts.items[2].type as ChoiceType).choices, ["P1", "P2"]);
  t.deepEqual((parts.items[2].type as ChoiceType).labels, [
    { __code__: "P1", en: "Page 1" },
    { __code__: "P2", en: "Page 2" },
  ]);
  t.end();
});

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.options({ languages: ["en"] });
  b.pageSet("PS1").pages("P1", "P2");
  b.page("P1").translate("en", "Page 1");
  b.page("P2").translate("en", "Page 2");
  b.workflow().initial("PS1");
  return b.get();
}
