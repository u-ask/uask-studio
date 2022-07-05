import {
  DomainCollection,
  getItem,
  InterviewItem,
  MutableParticipant,
  MutableSurvey,
  Participant,
  Sample,
  SurveyBuilder,
} from "uask-dom";
import test from "tape";
import { OrderItemCommand } from "./orderitemcommand.js";
import { isConsistent } from "./test-utils.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("Visit 1").pages("P1");
  b.page("P1")
    .startSection("section 1")
    .question("Q1", "Q1", b.types.text)
    .question("Q2", "Q2", b.types.yesno)
    .endSection()
    .question("Q3", "Q3", b.types.real)
    .include("P2")
    .question("Q4", "Q4", b.types.real)
    .startSection("section 2")
    .question("Q5", "Q5", b.types.text)
    .question("Q6", "Q6", b.types.text)
    .endSection();
  b.page("P2")
    .question("_1_", "_1_", b.types.image)
    .question("_2_", "_2_", b.types.acknowledge);
  const survey = b.get();
  const participant = new Participant("0001", new Sample("1"));
  return { survey, participant };
}

test("start order items command #369", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new OrderItemCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, 0, 1);
  t.equal(mutableSurvey.pages[0].items[2], command.directionPart);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

const up = (command: OrderItemCommand) => [
  new InterviewItem(command.directionPart, "up"),
];

const down = (command: OrderItemCommand) => [
  new InterviewItem(command.directionPart, "down"),
];

test("Apply order items command : up in section #369", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new OrderItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 1);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, up(command));
  t.deepEqual(
    mutableSurvey.pages[0].items.map(i => getItem(i).variableName),
    DomainCollection("Q2", "Q1", "Q3", "_1_", "_2_", "Q4", "Q5", "Q6")
  );
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Apply order items command: down in section #369", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new OrderItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 0);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, down(command));
  t.deepEqual(
    mutableSurvey.pages[0].items.map(i => getItem(i).variableName),
    DomainCollection("Q2", "Q1", "Q3", "_1_", "_2_", "Q4", "Q5", "Q6")
  );
  t.end();
});

test("Apply order items command : up for item not in section #369", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new OrderItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 2);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, up(command));
  t.deepEqual(
    mutableSurvey.pages[0].items.map(i => getItem(i).variableName),
    DomainCollection("Q1", "Q2", "Q3", "_1_", "_2_", "Q4", "Q5", "Q6")
  );
  t.deepEqual(getItem(mutableSurvey.pages[0].items[2]).section, "section 1");
  t.end();
});

test("Apply order items command : down for item not in section #369", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new OrderItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 5);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, down(command));
  t.deepEqual(
    mutableSurvey.pages[0].items.map(i => getItem(i).variableName),
    DomainCollection("Q1", "Q2", "Q3", "_1_", "_2_", "Q4", "Q5", "Q6")
  );
  t.deepEqual(getItem(mutableSurvey.pages[0].items[5]).section, "section 2");
  t.end();
});

test("Apply order items command : up for item leaving section #369", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new OrderItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 6);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, up(command));
  t.deepEqual(
    mutableSurvey.pages[0].items.map(i => getItem(i).variableName),
    DomainCollection("Q1", "Q2", "Q3", "_1_", "_2_", "Q4", "Q5", "Q6")
  );
  t.deepEqual(getItem(mutableSurvey.pages[0].items[6]).section, undefined);
  t.end();
});

test("Apply order items command : down for item leaving section #369", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new OrderItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 1);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, down(command));
  t.deepEqual(
    mutableSurvey.pages[0].items.map(i => getItem(i).variableName),
    DomainCollection("Q1", "Q2", "Q3", "_1_", "_2_", "Q4", "Q5", "Q6")
  );
  t.deepEqual(getItem(mutableSurvey.pages[0].items[1]).section, undefined);
  t.end();
});

test("Apply order items command : up for item leaving first section #369", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new OrderItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 0);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, up(command));
  t.deepEqual(
    mutableSurvey.pages[0].items.map(i => getItem(i).variableName),
    DomainCollection("Q1", "Q2", "Q3", "_1_", "_2_", "Q4", "Q5", "Q6")
  );
  t.deepEqual(getItem(mutableSurvey.pages[0].items[0]).section, undefined);
  t.end();
});

test("Apply order items command : down for item leaving last section #369", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new OrderItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 7);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, down(command));
  t.deepEqual(
    mutableSurvey.pages[0].items.map(i => getItem(i).variableName),
    DomainCollection("Q1", "Q2", "Q3", "_1_", "_2_", "Q4", "Q5", "Q6")
  );
  t.deepEqual(getItem(mutableSurvey.pages[0].items[7]).section, undefined);
  t.end();
});

test("Apply order items command : up for item stays in include #369", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new OrderItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 3);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, up(command));
  t.deepEqual(
    mutableSurvey.pages[0].items.map(i => getItem(i).variableName),
    DomainCollection("Q1", "Q2", "Q3", "_1_", "_2_", "Q4", "Q5", "Q6")
  );
  t.true(survey.pages[1].includes.includes(getItem(survey.pages[0].items[3])));
  t.end();
});

test("Apply order items command : down for item stays in include #369", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new OrderItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 4);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, down(command));
  t.deepEqual(
    mutableSurvey.pages[0].items.map(i => getItem(i).variableName),
    DomainCollection("Q1", "Q2", "Q3", "_1_", "_2_", "Q4", "Q5", "Q6")
  );
  t.true(
    mutableSurvey.pages[1].includes.includes(
      getItem(mutableSurvey.pages[0].items[4])
    )
  );
  t.end();
});

test("Apply order items command : up for item moves in include #369", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new OrderItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 4);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, up(command));
  t.deepEqual(
    mutableSurvey.pages[0].items.map(i => getItem(i).variableName),
    DomainCollection("Q1", "Q2", "Q3", "_2_", "_1_", "Q4", "Q5", "Q6")
  );
  t.true(
    mutableSurvey.pages[1].includes.includes(
      getItem(mutableSurvey.pages[0].items[3])
    )
  );
  t.end();
});

test("Apply order items command : up for item moves over include #369", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new OrderItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 5);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, up(command));
  t.deepEqual(
    mutableSurvey.pages[0].items.map(i => getItem(i).variableName),
    DomainCollection("Q1", "Q2", "Q3", "Q4", "_1_", "_2_", "Q5", "Q6")
  );
  t.true(
    mutableSurvey.pages[0].includes.includes(
      getItem(mutableSurvey.pages[0].items[3])
    )
  );
  t.end();
});

test("Apply order items command : down for item moves over include #369", t => {
  const { survey, participant } = buildTestSurvey();
  const command = new OrderItemCommand();
  command.start(new MutableSurvey(survey), new MutableParticipant(participant), 0, 2);
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.apply(mutableSurvey, mutableParticipant, down(command));
  t.deepEqual(
    mutableSurvey.pages[0].items.map(i => getItem(i).variableName),
    DomainCollection("Q1", "Q2", "_1_", "_2_", "Q3", "Q4", "Q5", "Q6")
  );
  t.true(
    mutableSurvey.pages[0].includes.includes(
      getItem(mutableSurvey.pages[0].items[4])
    )
  );
  t.end();
});
