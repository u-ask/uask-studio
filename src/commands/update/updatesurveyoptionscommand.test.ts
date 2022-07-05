import {
  InterviewItem,
  MutableParticipant,
  MutableSurvey,
  PageItem,
  ParticipantBuilder,
  SurveyBuilder,
} from "uask-dom";
import test from "tape";
import { isConsistent } from "../test-utils.js";
import { UpdateSurveyOptionsCommand } from "./updatesurveyoptionscommand.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.workflow()
    .home("SYNT")
    .initial("INIT")
    .followUp("FUP")
    .auxiliary("BIOCH")
    .end("END");
  b.workflow("participant").withPageSets("INIT", "FUP");
  b.pageSet("SYNT")
    .pageSet("INIT")
    .pageSet("FUP")
    .pageSet("BIOCH")
    .pageSet("END");
  const survey = b.get();
  const pb = new ParticipantBuilder(survey);
  pb.interview("SYNT");
  const participant = pb.build();
  return { survey, participant };
}

test("Start survey options update command #368", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new UpdateSurveyOptionsCommand();
  command.start(mutableSurvey, mutableParticipant, 0);
  const partsVariableNames = [
    "__AVAILABLE_LANGS__",
    "__DEFAULT_LANG__",
    "__EPRO__",
    "__LANGS_TITLE__",
    "__PARTICIPANT_STRATEGY_TITLE__",
    "__PARTICIPANT_CODE_LENGTH__",
    "__PARTICIPANT_CODE_BY_SAMPLE__",
    "__ADVANCED_OPTIONS__",
    "__INTERVIEW_DATE_VAR__",
    "__PHONE_VAR__",
    "__EMAIL_VAR__",
    "__CONSENT_VAR__",
    "__SHOW_FILLRATES__",
    "__UNIT_SUFFIX__",
    "__INC_VAR__",
    "__SIGN_VAR__",
  ];
  t.true(
    partsVariableNames.every(n =>
      mutableSurvey.pageSets[0].pages[0].items.find(
        p => (p as PageItem).variableName == n
      )
    )
  );
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Interview items for survey options update #368", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new UpdateSurveyOptionsCommand();
  command.start(mutableSurvey, mutableParticipant, 0);
  const items = Reflect.get(command, "getPartItems").call(command);
  t.deepEquals(items[0].value, ["en", "fr"]);
  t.equal(items[1].value, "en");
  t.equal(items[2].value, 0);
  t.equal(items[3].value, 1);
  t.equal(items[4].value, 5);
  t.equal(items[5].value, 0);
  t.equal(items[6].value, "VDATE");
  t.equal(items[7].value, "__PHONE");
  t.equal(items[8].value, "__EMAIL");
  t.equal(items[9].value, "_UNIT");
  t.equal(items[10].value, "__INCLUDED");
  t.end();
});

test("Apply update survey options command #368", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new UpdateSurveyOptionsCommand();
  command.start(
    new MutableSurvey(survey),
    new MutableParticipant(participant),
    0
  );
  const items = [
    new InterviewItem(command.eproPart, 0),
    new InterviewItem(command.fillratesPart, 0),
    new InterviewItem(command.availableLangsPart, ["fr"]),
    new InterviewItem(command.defaultLangPart, "fr"),
    new InterviewItem(command.participantCodeLengthPart, 4),
    new InterviewItem(command.participantCodeBySitePart, 1),
    new InterviewItem(command.inclusionPart, "_INCLUSION"),
    new InterviewItem(command.applyPart, true),
  ];
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, items);
  const expected = {
    languages: ["fr"],
    defaultLang: "fr",
    interviewDateVar: "VDATE",
    phoneVar: "__PHONE",
    emailVar: "__EMAIL",
    showFillRate: false,
    epro: false,
    inclusionVar: {
      name: "_INCLUSION",
      hidden: false,
    },
    unitSuffix: "_UNIT",
    workflowVar: "__WORKFLOW",
    participantCodeStrategy: {
      length: 4,
      bySite: true,
    },
  };
  t.deepEqual(mutableSurvey.options, expected);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});
