import {
  InterviewItem,
  MutableParticipant,
  MutableSurvey,
  ParticipantBuilder,
  SurveyBuilder,
} from "uask-dom";
import test from "tape";
import { isConsistent } from "../test-utils.js";
import { UpdatePageSetCommand } from "./updatepagesetcommand.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("PS1")
    .pages("P1")
    .datevariable("VDATE1")
    .pageSet("PS2")
    .pages("P2");
  b.page("P1").question("Q1", "Q1", b.types.text);
  b.page("P2").question("Q2", "Q2", b.types.text);
  b.workflow();
  const survey = b.get();
  const pb = new ParticipantBuilder(survey);
  pb.interview("PS1").item("Q1").value("1");
  pb.interview("PS2").item("Q2").value("2");
  const participant = pb.build();
  return { survey, participant };
}

test("Start page set update command", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new UpdatePageSetCommand();
  command.start(mutableSurvey, mutableParticipant, 0);
  t.deepLooseEqual(mutableSurvey.pageSets[0].pages[0].name, {
    en: "Visit Parameters",
    fr: "Paramètres de la visite",
  });
  t.equal(command.typePart?.variableName, "__PAGE_SET_NAME__");
  t.equal(command.dateVarPart?.variableName, "__PAGE_SET_DATEVAR__");
  t.equal(command.pagesPart?.variableName, "__PAGE_SET_PAGES__");
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Interview items for page set update", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new UpdatePageSetCommand();
  command.start(mutableSurvey, mutableParticipant, 0);
  const interviewItems = mutableParticipant.interviews[0].items;
  const pageSetName = interviewItems.find(
    i => i.pageItem == command.typePart
  )?.value;
  t.equal(pageSetName, "PS1");
  const pageSetDateVar = interviewItems.find(
    i => i.pageItem == command.dateVarPart
  )?.value;
  t.equal(pageSetDateVar, "VDATE1");
  const pageSetPages = interviewItems.find(
    i => i.pageItem == command.pagesPart
  )?.value;
  t.deepLooseEqual(pageSetPages, [{ name: "P1", mandatory: false }]);
  t.end();
});

test("Apply changes to pageSet", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new UpdatePageSetCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0);
  const interviewItems = [
    new InterviewItem(command.typePart, "PS0"),
    new InterviewItem(command.dateVarPart, "VDATE0"),
    new InterviewItem(command.pagesPart, [
      { name: "P1", mandatory: false },
      { name: "P2", mandatory: false },
    ]),
    new InterviewItem(command.applyPart, true),
  ];
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, interviewItems);
  t.deepEqual(mutableSurvey.pageSets[0].type, { __code__: "PS1", en: "PS0" });
  t.equal(mutableSurvey.pageSets[0].datevar, "VDATE0");
  t.deepLooseEqual(
    mutableSurvey.pageSets[0].pages.map(p => p.name),
    ["P1", "P2"]
  );
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});
