import {
  SurveyBuilder,
  ParticipantBuilder,
  PageBuilder,
  PageSetBuilder,
} from "uask-dom";
import test from "tape";
import {
  AllLanguagesSetRule,
  UniquePageItemRule,
  UniquePageRule,
  UniquePageSetRule,
  VariableAndLanguageSetRule,
} from "./rules.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.options({
    defaultLang: "en",
    languages: ["fr", "en"],
  });
  b.pageSet("PS2").pages("P3");
  b.page("P3")
    .question("Question 1", "Q1", b.types.text)
    .question("Question 2", "Q2", b.types.integer);
  const survey = b.get();
  const pb = new ParticipantBuilder(survey);
  pb.interview("PS2").item("Q1").value("A").item("Q2").value(2);
  const participant = pb.build();
  return { survey, participant };
}

test("Create unique page item rule #97", t => {
  const { survey } = buildTestSurvey();
  const uniqueRule = new UniquePageItemRule(survey);
  const exec = uniqueRule.execute({ value: "Q1" });
  t.deepLooseEqual(exec.messages, { unique: "variable name must be unique" });
  t.end();
});

test("Create unique page item rule #414", t => {
  const { survey } = buildTestSurvey();
  const uniqueRule = new AllLanguagesSetRule(survey.options);
  const exec = uniqueRule.execute({ value: { en: " ", fr: "Q1" } });
  t.deepLooseEqual(exec.messages, {
    allLanguages: "all languages must be set",
  });
  t.end();
});

test("Create unique page item rule #414", t => {
  const { survey } = buildTestSurvey();
  const uniqueRule = new AllLanguagesSetRule(survey.options);
  const exec = uniqueRule.execute({ value: { en: undefined, fr: "Q1" } });
  t.deepLooseEqual(exec.messages, {
    allLanguages: "all languages must be set",
  });
  t.end();
});

test("Create unique page item rule #414", t => {
  const { survey } = buildTestSurvey();
  const uniqueRule = new AllLanguagesSetRule(survey.options);
  const exec = uniqueRule.execute({ value: { fr: "Q1" } });
  t.deepLooseEqual(exec.messages, {
    allLanguages: "all languages must be set",
  });
  t.end();
});

test("Create unique page rule #97", t => {
  const { survey } = buildTestSurvey();
  const page = new PageBuilder("P3", {}).build([]);
  const uniqueRule = new UniquePageRule(survey, page);
  const exec = uniqueRule.execute({ value: "P3" });
  t.deepLooseEqual(exec.messages, { unique: "page name must be unique" });
  t.end();
});

test("Create unique page set rule #249", t => {
  const { survey } = buildTestSurvey();
  const pageSet = new PageSetBuilder("PS2", {}).build([]);
  const uniqueRule = new UniquePageSetRule(survey, pageSet);
  const exec = uniqueRule.execute({ value: "PS2" });
  t.deepLooseEqual(exec.messages, { unique: "page set code must be unique" });
  t.end();
});

test("Variable and languages composite rule #419", t => {
  const colRule = new VariableAndLanguageSetRule({ languages: ["fr", "en"] });
  const item = {
    messages: { required: "value is required", flag: "this is flag" },
    value: [
      { name: "VAR", label: { en: "enough", fr: "suffisant" } },
      { name: "VAR2", label: { en: "enough", fr: "suffisant" } },
    ],
  };
  const r1 = colRule.execute(item);
  const msg1 = r1.messages as {
    required?: string;
    allLanguages?: string;
    flag?: string;
  };
  t.equal(msg1?.required, undefined);
  t.equal(msg1?.allLanguages, undefined);
  t.equal(msg1?.flag, "this is flag");
  t.end();
});

test("Variable and languages composite rule violates required #419", t => {
  const colRule = new VariableAndLanguageSetRule({ languages: ["fr", "en"] });
  const r1 = colRule.execute({
    messages: {},
    value: [
      { name: undefined, label: { en: "enough", fr: "suffisant" } },
      { name: "VAR", label: { en: "enough", fr: "suffisant" } },
    ],
  });
  const msg1 = r1.messages as { required?: string; allLanguages?: string };
  t.equal(msg1?.required, "value is required");
  t.equal(msg1?.allLanguages, undefined);
  t.end();
});

test("Variable and languages composite rule violates languages #419", t => {
  const colRule = new VariableAndLanguageSetRule({ languages: ["fr", "en"] });
  const r1 = colRule.execute({
    messages: {},
    value: [
      { name: "VAR", label: { en: "not enough" } },
      { name: "VAR2", label: { fr: "assez", en: "enough" } },
    ],
  });
  const msg1 = r1.messages as { required?: string; allLanguages?: string };
  t.equal(msg1?.required, undefined);
  t.equal(msg1?.allLanguages, "all languages must be set");
  t.end();
});

test("Variable and languages composite rule violates required and languages #419", t => {
  const colRule = new VariableAndLanguageSetRule({ languages: ["fr", "en"] });
  const r1 = colRule.execute({
    messages: {},
    value: [
      { name: undefined, label: { en: "not enough" } },
      { name: "CORRECT", label: { en: "enough", fr: "assez" } },
    ],
  });
  const msg1 = r1.messages as { required?: string; allLanguages?: string };
  t.equal(msg1?.required, "value is required");
  t.equal(msg1?.allLanguages, "all languages must be set");
  t.end();
});
