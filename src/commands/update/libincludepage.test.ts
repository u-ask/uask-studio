import {
  acknowledgeItem,
  ChoiceType,
  getScopedItem,
  IntegerType,
  SurveyBuilder,
} from "uask-dom";
import { libIncludePage } from "./libincludepage.js";
import test from "tape";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.options({
    languages: ["fr", "en"],
  });
  b.pageSet("PS1").pages("P1", "P2");
  b.page("P1")
    .translate("en", "P1 en")
    .translate("fr", "P1 fr")
    .question("Q1.1", "Q11", b.types.yesno)
    .question("Q1.2", "Q12", b.types.yesno);
  b.page("P2")
    .translate("en", "P2 en")
    .translate("fr", "P2 fr")
    .question("Q1.1", "Q21", b.types.yesno)
    .question("Q1.2", "Q22", b.types.yesno);
  return b.get();
}

test("Include page has a page selector #386", t => {
  const survey = buildTestSurvey();
  const b = new SurveyBuilder();
  libIncludePage(b, "Include", survey);
  const parts = b.get();
  const pageChoice = parts.items.find(
    i => i.variableName == "__INCLUDE_PAGE__"
  );
  t.deepEqual((pageChoice?.type as ChoiceType).choices, ["P1", "P2"]);
  t.deepEqual((pageChoice?.type as ChoiceType).labels, [
    { __code__: "P1", en: "P1 en", fr: "P1 fr" },
    { __code__: "P2", en: "P2 en", fr: "P2 fr" },
  ]);
  t.end();
});

test("Include page has question selectors #386", t => {
  const survey = buildTestSurvey();
  const b = new SurveyBuilder();
  libIncludePage(b, "Include", survey);
  const parts = b.get();
  const include = parts.items[0];
  const pageChoice = parts.items[1];
  const selector1 = parts.items.find(
    i => i.variableName == "__INCLUDE_SELECT_P1__"
  );
  t.deepEqual((selector1?.type as ChoiceType).choices, ["Q11", "Q12"]);
  const rule1 = parts.crossRules.find(r => r.target == selector1);
  t.deepLooseEqual(rule1?.args.underlyingRule, "activation");
  t.deepLooseEqual(rule1?.pageItems.map(getScopedItem), [
    pageChoice,
    include,
    acknowledgeItem,
    selector1,
  ]);
  const selector2 = parts.items.find(
    i => i.variableName == "__INCLUDE_SELECT_P2__"
  );
  t.deepEqual((selector2?.type as ChoiceType).choices, ["Q21", "Q22"]);
  const rule2 = parts.crossRules.find(r => r.target == selector2);
  t.deepLooseEqual(rule2?.args.underlyingRule, "activation");
  t.deepLooseEqual(rule2?.pageItems.map(getScopedItem), [
    pageChoice,
    include,
    acknowledgeItem,
    selector2,
  ]);
  t.end();
});

test("Include page has a context field #386", t => {
  const survey = buildTestSurvey();
  const b = new SurveyBuilder();
  libIncludePage(b, "Include", survey);
  const parts = b.get();
  const context = parts.items.find(
    i => i.variableName == "__INCLUDE_CONTEXT__"
  );
  t.ok(context?.type instanceof IntegerType);
  t.end();
});
