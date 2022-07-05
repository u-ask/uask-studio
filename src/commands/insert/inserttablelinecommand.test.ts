import {
  getItem,
  InterviewItem,
  MutableParticipant,
  MutableSurvey,
  PageItem,
  ParticipantBuilder,
  SurveyBuilder,
} from "uask-dom";
import { InsertTableLineCommand } from "./inserttablelinecommand.js";
import test from "tape";
import { getStudioItems } from "../test-utils.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("INIT").pages("P1", "P2");
  b.page("P1")
    .question("Question 1", "Q1", b.types.text)
    .question("Question 2", "Q2", b.types.integer);
  b.page("P2")
    .question("row1 -> col1", "R1C1", b.types.text)
    .question("row1 -> col2", "R1C2", b.types.text);
  const survey = b.get();
  const pb = new ParticipantBuilder(survey);
  pb.interview("INIT").item("Q1").value("Answer").item("Q2").value(2);
  const participant = pb.build();
  return { survey, participant };
}

test("start insert table line command #303", t => {
  const { survey, participant } = buildTestSurvey();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  const command = new InsertTableLineCommand();
  command.start(mutableSurvey, mutableParticipant, 0, 2);
  const partVariableNames = [
    "__TITLE__",
    "__LINE_POSITION__",
    "__COLUMN_NAMES__",
    "__LINE_NAME__",
    "__APPLY__",
  ];
  t.true(
    partVariableNames.every(v =>
      mutableSurvey.pages[0].items.find(i => v == (i as PageItem).variableName)
    )
  );
  t.end();
});

test("Interview items for insert table line after table #303", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertTableLineCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, 1, 2);
  const interviewItems = getStudioItems(mutableParticipant, participant);
  t.equal(getItem(mutableSurvey.pages[1].items[4]).rules.length, 1);
  t.deepLooseEqual(interviewItems[1]?.value, [
    { name: "", label: "col1" },
    { name: "", label: "col2" },
  ]);
  t.end();
});

test("Apply new table line modification to position 1 #303", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertTableLineCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, 1, 2);
  const interviewItems = [
    new InterviewItem(command.positionPart, 1),
    new InterviewItem(command.columnNamesPart, [
      { name: "VARCOL1", label: "col1" },
      { name: "VARCOL2", label: "col2" },
    ]),
    new InterviewItem(command.lineNamePart, "row2"),
  ];
  command.apply(mutableSurvey, mutableParticipant, interviewItems);
  t.deepLooseEqual(getItem(mutableSurvey.pages[1].items[0])?.wording, {
    en: "row2 -> col1",
    fr: "row2 -> col1",
  });
  t.deepLooseEqual(getItem(mutableSurvey.pages[1].items[1])?.wording, {
    en: "row2 -> col2",
    fr: "row2 -> col2",
  });
  t.end();
});

test("Apply new table line modification to position 1 #303", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertTableLineCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, 1, 2);
  const interviewItems = [
    new InterviewItem(command.positionPart, 2),
    new InterviewItem(command.columnNamesPart, [
      { name: "VARCOL1", label: "col1" },
      { name: "VARCOL2", label: "col2" },
    ]),
    new InterviewItem(command.lineNamePart, "row2"),
  ];
  command.apply(mutableSurvey, mutableParticipant, interviewItems);
  t.deepLooseEqual(getItem(mutableSurvey.pages[1].items[2])?.wording, {
    en: "row2 -> col1",
    fr: "row2 -> col1",
  });
  t.deepLooseEqual(getItem(mutableSurvey.pages[1].items[3])?.wording, {
    en: "row2 -> col2",
    fr: "row2 -> col2",
  });
  t.end();
});

test("Apply new table line multiLang modification #303", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new InsertTableLineCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, 1, 2);
  const interviewItems = [
    new InterviewItem(command.columnNamesPart, [
      { name: "VAR1", label: { en: "col1", fr: "col1" } },
      { name: "VAR2", label: { en: "col2", fr: "col2" } },
    ]),
    new InterviewItem(command.lineNamePart, { en: "row2", fr: "ligne2" }),
  ];
  command.apply(mutableSurvey, mutableParticipant, interviewItems);
  t.deepLooseEqual(getItem(mutableSurvey.pages[1].items[2])?.wording, {
    en: "row2 -> col1",
    fr: "ligne2 -> col1",
  });
  t.deepLooseEqual(getItem(mutableSurvey.pages[1].items[3])?.wording, {
    en: "row2 -> col2",
    fr: "ligne2 -> col2",
  });
  t.end();
});
