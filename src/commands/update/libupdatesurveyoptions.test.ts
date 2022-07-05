import { SurveyBuilder } from "uask-dom";
import test from "tape";
import { libUpdateSurveyOptions } from "./libupdatesurveyoptions.js";

test("Add update pageSet information #368", t => {
  const b = new SurveyBuilder();
  libUpdateSurveyOptions(b, "updateSurveyOptions");
  const parts = b.get();
  const partsVariableNames = [
    "__AVAILABLE_LANGS__",
    "__DEFAULT_LANG__",
    "__EPRO__",
    "__LANGS_TITLE__",
    "__PARTICIPANT_STRATEGY_TITLE__",
    "__PARTICIPANT_CODE_LENGTH__",
    "__PARTICIPANT_CODE_BY_SAMPLE__",
    "__ADVANCED_OPTIONS_TITLE__",
    "__ADVANCED_OPTIONS__",
    "__INTERVIEW_DATE_VAR__",
    "__PHONE_VAR__",
    "__EMAIL_VAR__",
    "__SHOW_FILLRATES__",
    "__UNIT_SUFFIX__",
    "__INC_VAR__",
    "__SIGN_VAR__",
  ];
  t.true(
    partsVariableNames.every(n => parts.items.find(p => p.variableName == n))
  );
  t.end();
});
