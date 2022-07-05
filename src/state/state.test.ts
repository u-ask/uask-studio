import {
  InterviewItem,
  ItemTypes,
  MutableParticipant,
  MutableSurvey,
  PageItem,
  Participant,
  ParticipantBuilder,
  Survey,
  SurveyBuilder,
} from "uask-dom";
import test from "tape";
import {
  DeleteItemCommand,
  DeletePageCommand,
  DeletePageSetCommand,
  DeleteWorkflowCommand,
  IMutationCommand,
  InsertItemCommand,
  InsertPageCommand,
  InsertPageSetCommand,
  InsertWorkflowCommand,
  OrderItemCommand,
  UpdateItemCommand,
  UpdatePageCommand,
  UpdatePageSetCommand,
  UpdateSurveyOptionsCommand,
  UpdateWorkflowCommand,
} from "../commands/index.js";
import { completeInterview } from "../commands/test-utils.js";
import { ParticipantState, SurveyState } from "./state.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.workflow();
  b.workflow("W1");
  b.pageSet("PS1")
    .pages("P1")
    .datevariable("VDATE1")
    .pageSet("PS2")
    .pages("P2", "P3");
  b.page("P1").question("Q1", "Q1", b.types.text);
  b.page("P2").question("Q2", "Q2", b.types.text);
  b.page("P3")
    .question("Q3", "Q3", b.types.text)
    .question("Q4", "Q4", b.types.text);
  const survey = b.get();
  const pb = new ParticipantBuilder(survey);
  pb.interview("PS1").item("Q1").value("1");
  pb.interview("PS2")
    .item("Q2")
    .value("2")
    .item("Q3")
    .value("3")
    .item("Q4")
    .value("4");
  const participant = pb.build();
  return { survey, participant };
}

test("State is a participant", t => {
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(new SurveyState(survey), participant);
  t.true(state instanceof Participant);
  t.equal(state.participant, state);
  t.end();
});

class TestCommand implements IMutationCommand {
  receivedSurvey?: Survey;
  receivedParticipant?: Participant;

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    name: string
  ): void {
    this.receivedSurvey = survey.value;
    this.receivedParticipant = participant.value;
    survey.value = survey.value.update({ name: name });
    participant.value = participant.value.update({ participantCode: name });
  }

  apply(
    survey: MutableSurvey,
    participant: MutableParticipant,
    items: InterviewItem[]
  ) {
    this.receivedSurvey = survey.value;
    this.receivedParticipant = participant.value;
    const name = items[0].value as string;
    if (name == "error") throw "error";
    survey.value = survey.value.update({ name: name });
    participant.value = participant.value.update({ participantCode: name });
  }
  canApply(): boolean {
    return true;
  }
}

test("Start command from state", t => {
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(new SurveyState(survey), participant);

  state.start(TestCommand, "started");
  t.equal(state.survey.name, "started");
  t.equal(state.participant.participantCode, "started");
  t.true(state.isPending);
  t.equal(state.participant, state);
  t.end();
});

test("Apply command from state", t => {
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(new SurveyState(survey), participant);

  state.start(TestCommand, "started");
  const items = [
    new InterviewItem(new PageItem("", "", ItemTypes.text), "applied"),
  ];
  state.apply(items);
  t.equal(state.survey.name, "applied");
  t.equal(state.participantCode, "applied");
  t.true(state.isIdle);
  t.equal(state.participant, state);
  t.end();
});

test("Start and apply receives initial domain objects", t => {
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(new SurveyState(survey), participant);

  state.start(TestCommand, "started");
  const command = Reflect.get(state, "pending").command as TestCommand;
  t.equal(command.receivedSurvey, survey);
  t.equal(command.receivedParticipant, participant);

  const items = [
    new InterviewItem(new PageItem("", "", ItemTypes.text), "applied"),
  ];
  state.apply(items);
  t.equal(command.receivedSurvey, survey);
  t.equal(command.receivedParticipant, participant);
  t.end();
});

test("Cancel command from state", t => {
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(new SurveyState(survey), participant);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  state.start(TestCommand, "started").catch(() => {});
  t.notEqual(state.survey.value, survey);
  t.notEqual(state.participant.value, participant);

  state.cancel();
  t.equal(state.survey.value, survey);
  t.equal(state.participant.value, participant);
  t.true(state.isIdle);
  t.equal(state.participant, state);
  t.end();
});

test("Starting a command trows when command pending", t => {
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(new SurveyState(survey), participant);

  state.start(TestCommand, "started");
  t.throws(() => state.start(TestCommand, "started"));
  t.end();
});

test("Canceling a command trows when no command pending", t => {
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(new SurveyState(survey), participant);

  t.throws(() => state.cancel());
  t.end();
});

test("Start promise resolved as applied", async t => {
  t.plan(4);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(new SurveyState(survey), participant);

  const started = state.start(TestCommand, "started").then(({ result }) => {
    t.equal(result, "applied");
    t.equal(state.survey.name, "applied");
    t.equal(state.participantCode, "applied");
    t.true(state.isIdle);
  });

  const items = [
    new InterviewItem(new PageItem("", "", ItemTypes.text), "applied"),
  ];
  state.apply(items);
  await started;
  t.end();
});

test("Start promise resolved as canceled", async t => {
  t.plan(4);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(new SurveyState(survey), participant);

  const started = state.start(TestCommand, "started").then(({ result }) => {
    t.equal(result, "canceled");
    t.equal(state.survey.value, survey);
    t.equal(state.participant.value, participant);
    t.true(state.isIdle);
  });

  state.cancel();
  await started;
  t.end();
});

test("Command started gives modification target", async t => {
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(new SurveyState(survey), participant);

  state.start(UpdateItemCommand, 1, 0);
  t.equal(state.page, state.survey.pages[1]);
  t.equal(state.pageItem, state.survey.items[1]);
  t.true(state.interviews[1].items.length > 1);

  t.end();
});

test("Command applied gives modification target", async t => {
  t.plan(4);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(new SurveyState(survey), participant);

  const started = state
    .start(UpdateItemCommand, 1, 0)
    .then(({ page, pageItem }) => {
      t.equal(page, state.survey.pages[1]);
      t.equal(pageItem, state.survey.items[1]);
    });

  const command = Reflect.get(state, "pending").command as UpdateItemCommand;
  const result = state.apply([
    new InterviewItem(command.wordingPart, "blabla"),
    new InterviewItem(command.typePart, "text"),
  ]);
  t.equal(result.page, state.survey.pages[1]);
  t.equal(result.pageItem, state.survey.items[1]);
  await started;
  t.end();
});

test("Command canceled gives modification target", async t => {
  t.plan(4);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(new SurveyState(survey), participant);

  const started = state
    .start(UpdateItemCommand, 1, 0)
    .then(({ page, pageItem }) => {
      t.equal(page, survey.pages[1]);
      t.equal(pageItem, survey.items[1]);
    });

  const results = state.cancel();
  t.equal(results.page, survey.pages[1]);
  t.equal(results.pageItem, survey.items[1]);
  await started;
  t.end();
});

test("State promise rejected on error", async t => {
  t.plan(2);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(new SurveyState(survey), participant);

  const started = state.start(TestCommand, "started").catch(e => {
    t.equal(e, "error");
  });

  const items = [
    new InterviewItem(new PageItem("", "", ItemTypes.text), "error"),
  ];
  t.throws(() => state.apply(items));
  await started;
  t.end();
});

test("State set nonce on current value and pending context", t => {
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  state.start(TestCommand, "nonce");
  state.init([{ nonce: 986521 }, { items: [] }]);
  t.equal(state.participant.interviews[1].nonce, 986521);
  t.equal(state.interview.nonce, 986521);
  t.end();
});

test("Command started from interview state gives modification target", async t => {
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  state.start(UpdateItemCommand, 1, 0);
  t.equal(state.interview, state.participant.interviews[1]);
  t.equal(state.pageSet, state.survey.pageSets[1]);
  t.equal(state.page, state.survey.pages[1]);
  t.equal(state.pageItem, state.survey.items[1]);

  t.end();
});

test("Get interview state throws if pending", async t => {
  const { survey, participant } = buildTestSurvey();
  const participantState = new ParticipantState(
    new SurveyState(survey),
    participant
  );
  const state = participantState.getState(participant.interviews[1]);

  const interviewIndex = Reflect.get(state, "interviewIndex");

  state.start(UpdateItemCommand, 1, 0);

  const completedInterview = completeInterview(state.interview);
  const state2 = participantState.getState(completedInterview);
  t.equal(Reflect.get(state2, "interviewIndex"), interviewIndex);
  t.end();
});

test("Command applied from interview state gives modification target", async t => {
  t.plan(8);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(UpdateItemCommand, 1, 0)
    .then(({ interview, pageSet, page, pageItem }) => {
      t.equal(interview, state.participant.interviews[1]);
      t.equal(pageSet, state.survey.pageSets[1]);
      t.equal(page, state.survey.pages[1]);
      t.equal(pageItem, state.survey.items[1]);
    });

  const command = Reflect.get(state, "pending").command as UpdateItemCommand;
  const result = state.apply([
    new InterviewItem(command.wordingPart, "blabla"),
    new InterviewItem(command.typePart, "text"),
  ]);
  t.equal(result.interview, state.participant.interviews[1]);
  t.equal(result.pageSet, state.survey.pageSets[1]);
  t.equal(result.page, state.survey.pages[1]);
  t.equal(result.pageItem, state.survey.items[1]);
  await started;
  t.end();
});

test("Command canceled from interview state gives modification target", async t => {
  t.plan(8);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(UpdateItemCommand, 1, 0)
    .then(({ interview, pageSet, page, pageItem }) => {
      t.equal(interview, participant.interviews[1]);
      t.equal(pageSet, survey.pageSets[1]);
      t.equal(page, survey.pages[1]);
      t.equal(pageItem, survey.items[1]);
    });

  const result = state.cancel();
  t.equal(result.interview, participant.interviews[1]);
  t.equal(result.pageSet, survey.pageSets[1]);
  t.equal(result.page, survey.pages[1]);
  t.equal(result.pageItem, survey.items[1]);
  await started;
  t.end();
});

test("Command canceled from insertion pageSet gives targets", async t => {
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(new SurveyState(survey), participant);

  const started = state.start(InsertPageSetCommand);
  t.notEqual(state.survey.value, survey);
  t.notEqual(state.participant.value, participant);

  const result = state.cancel();
  t.true(result.interview);
  t.true(result.pageSet);
  t.true(result.page);
  t.false(result.pageItem);
  await started;
  t.end();
});

test("Command canceled from insertion item gives targets", async t => {
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[0]);

  const pageIndex = 0;
  const pageItemIndex = survey.pages[pageIndex].items.length;
  const started = state.start(InsertItemCommand, pageIndex, pageItemIndex);

  const result = state.cancel();
  t.true(result.interview);
  t.true(result.pageSet);
  t.true(result.page);
  t.false(result.pageItem);
  await started;
  t.end();
});

test("Insert page item targets", async t => {
  t.plan(12);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(InsertItemCommand, 2, 1)
    .then(({ interview, pageSet, page, pageItem }) => {
      t.equal(interview, state.participant.interviews[1]);
      t.equal(pageSet, state.survey.pageSets[1]);
      t.equal(page, state.survey.pages[2]);
      t.equal(pageItem, state.survey.items[3]);
    });
  t.equal(state.interview, state.participant.interviews[1]);
  t.equal(state.pageSet, state.survey.pageSets[1]);
  t.equal(state.page, state.survey.pages[2]);
  t.equal(state.pageItem, state.survey.items[3]);

  const command = Reflect.get(state, "pending").command as InsertItemCommand;
  const updateCommand = Reflect.get(
    command,
    "updateCommand"
  ) as UpdateItemCommand;
  const result = state.apply([
    new InterviewItem(command.variableNamePart, "P4"),
    new InterviewItem(updateCommand.wordingPart, "P4"),
  ]);
  t.equal(result.interview, state.participant.interviews[1]);
  t.equal(result.pageSet, state.survey.pageSets[1]);
  t.equal(result.page, state.survey.pages[2]);
  t.equal(result.pageItem, state.survey.items[3]);
  await started;
  t.end();
});

test("Delete page item targets", async t => {
  t.plan(12);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(DeleteItemCommand, 2, 0)
    .then(({ interview, pageSet, page, pageItem }) => {
      t.equal(interview, state.participant.interviews[1]);
      t.equal(pageSet, state.survey.pageSets[1]);
      t.equal(page, state.survey.pages[2]);
      t.equal(pageItem, undefined);
    });
  t.equal(state.interview, state.participant.interviews[1]);
  t.equal(state.pageSet, state.survey.pageSets[1]);
  t.equal(state.page, state.survey.pages[2]);
  t.equal(state.pageItem, state.survey.items[2]);

  const result = state.apply([]);
  t.equal(result.interview, state.participant.interviews[1]);
  t.equal(result.pageSet, state.survey.pageSets[1]);
  t.equal(result.page, state.survey.pages[2]);
  t.equal(result.pageItem, undefined);
  await started;
  t.end();
});

test("Update page set targets", async t => {
  t.plan(9);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(UpdatePageSetCommand, 1)
    .then(({ interview, pageSet, page }) => {
      t.equal(interview, state.participant.interviews[1]);
      t.equal(pageSet, state.survey.pageSets[1]);
      t.equal(page, state.survey.pages[1]);
    });
  t.equal(state.interview, state.participant.interviews[1]);
  t.equal(state.pageSet, state.survey.pageSets[1]);
  t.equal(state.page, state.survey.pages[3]);

  const command = Reflect.get(state, "pending").command as UpdatePageSetCommand;
  const result = state.apply([
    new InterviewItem(command.typePart, "PS3"),
    new InterviewItem(command.pagesPart, ["P2", "P3"]),
  ]);
  t.equal(result.interview, state.participant.interviews[1]);
  t.equal(result.pageSet, state.survey.pageSets[1]);
  t.equal(result.page, state.survey.pages[1]);
  await started;
  t.end();
});

test("Insert page set targets", async t => {
  t.plan(9);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(InsertPageSetCommand)
    .then(({ interview, pageSet, page }) => {
      t.equal(interview, state.participant.interviews[2]);
      t.equal(pageSet, state.survey.pageSets[2]);
      t.equal(page, state.survey.pages[3]);
    });
  t.equal(state.interview, state.participant.interviews[2]);
  t.equal(state.pageSet, state.survey.pageSets[2]);
  t.equal(state.page, state.survey.pages[3]);

  const command = Reflect.get(state, "pending").command as InsertPageSetCommand;
  const updateCommand = Reflect.get(
    command,
    "updateCommand"
  ) as UpdatePageSetCommand;
  const result = state.apply([
    new InterviewItem(command.codePart, "PS3"),
    new InterviewItem(updateCommand.typePart, "PS3"),
  ]);
  t.equal(result.interview, state.participant.interviews[2]);
  t.equal(result.pageSet, state.survey.pageSets[2]);
  t.equal(result.page, state.survey.pages[3]);
  await started;
  t.end();
});

test("Delete page set targets", async t => {
  t.plan(9);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(DeletePageSetCommand, 1)
    .then(({ interview, pageSet, page }) => {
      t.equal(interview, state.participant.interviews[0]);
      t.equal(pageSet, state.survey.pageSets[0]);
      t.equal(page, state.survey.pages[0]);
    });
  t.equal(state.interview, state.participant.interviews[1]);
  t.equal(state.pageSet, state.survey.pageSets[1]);
  t.equal(state.page, state.survey.pages[3]);

  const result = state.apply([]);
  t.equal(result.interview, state.participant.interviews[0]);
  t.equal(result.pageSet, state.survey.pageSets[0]);
  t.equal(result.page, state.survey.pages[0]);
  await started;
  t.end();
});

test("Update page targets", async t => {
  t.plan(9);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(UpdatePageCommand, 2)
    .then(({ interview, pageSet, page }) => {
      t.equal(interview, state.participant.interviews[1]);
      t.equal(pageSet, state.survey.pageSets[1]);
      t.equal(page, state.survey.pages[2]);
    });
  t.equal(state.interview, state.participant.interviews[1]);
  t.equal(state.pageSet, state.survey.pageSets[1]);
  t.equal(state.page, state.survey.pages[2]);

  const command = Reflect.get(state, "pending").command as UpdatePageCommand;
  const result = state.apply([new InterviewItem(command.namePart, "P4")]);
  t.equal(result.interview, state.participant.interviews[1]);
  t.equal(result.pageSet, state.survey.pageSets[1]);
  t.equal(result.page, state.survey.pages[2]);
  await started;
  t.end();
});

test("Insert page targets", async t => {
  t.plan(9);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(InsertPageCommand, 1, 1)
    .then(({ interview, pageSet, page }) => {
      t.equal(interview, state.participant.interviews[1]);
      t.equal(pageSet, state.survey.pageSets[1]);
      t.equal(page, state.survey.pages[3]);
    });
  t.equal(state.interview, state.participant.interviews[1]);
  t.equal(state.pageSet, state.survey.pageSets[1]);
  t.equal(state.page, state.survey.pages[3]);

  const command = Reflect.get(state, "pending").command as InsertPageCommand;
  const updateCommand = Reflect.get(
    command,
    "updateCommand"
  ) as UpdatePageCommand;
  const result = state.apply([
    new InterviewItem(command.codePart, "P4"),
    new InterviewItem(updateCommand.namePart, "P4"),
  ]);
  t.equal(result.interview, state.participant.interviews[1]);
  t.equal(result.pageSet, state.survey.pageSets[1]);
  t.equal(result.page, state.survey.pages[3]);
  await started;
  t.end();
});

test("Delete page set targets", async t => {
  t.plan(9);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(DeletePageCommand, 1, 1)
    .then(({ interview, pageSet, page }) => {
      t.equal(interview, state.participant.interviews[1]);
      t.equal(pageSet, state.survey.pageSets[1]);
      t.equal(page, state.survey.pages[1]);
    });
  t.equal(state.interview, state.participant.interviews[1]);
  t.equal(state.pageSet, state.survey.pageSets[1]);
  t.equal(state.page, state.survey.pages[2]);

  const result = state.apply([]);
  t.equal(result.interview, state.participant.interviews[1]);
  t.equal(result.pageSet, state.survey.pageSets[1]);
  t.equal(result.page, state.survey.pages[1]);
  await started;
  t.end();
});

test("Order item targets", async t => {
  t.plan(12);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(OrderItemCommand, 2, 0, "down")
    .then(({ interview, pageSet, page, pageItem }) => {
      t.equal(interview, state.participant.interviews[1]);
      t.equal(pageSet, state.survey.pageSets[1]);
      t.equal(page, state.survey.pages[2]);
      t.equal(pageItem, state.survey.items[3]);
    });
  t.equal(state.interview, state.participant.interviews[1]);
  t.equal(state.pageSet, state.survey.pageSets[1]);
  t.equal(state.page, state.survey.pages[2]);
  t.equal(state.pageItem, state.survey.items[2]);

  const command = Reflect.get(state, "pending").command as OrderItemCommand;
  const result = state.apply([
    new InterviewItem(command.directionPart, "down"),
  ]);
  t.equal(result.interview, state.participant.interviews[1]);
  t.equal(result.pageSet, state.survey.pageSets[1]);
  t.equal(result.page, state.survey.pages[2]);
  t.equal(result.pageItem, state.survey.items[3]);
  await started;
  t.end();
});

test("Update workflow targets", async t => {
  t.plan(9);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(UpdateWorkflowCommand, 1, 0)
    .then(({ interview, pageSet, page }) => {
      t.equal(interview, state.participant.interviews[0]);
      t.equal(pageSet, state.survey.pageSets[0]);
      t.equal(page, state.survey.pages[0]);
    });
  t.equal(state.interview, state.participant.interviews[0]);
  t.equal(state.pageSet, state.survey.pageSets[0]);
  t.equal(state.page, state.survey.pages[3]);

  const command = Reflect.get(state, "pending")
    .command as UpdateWorkflowCommand;
  const result = state.apply([
    new InterviewItem(command.withpagesetsPart, ["PS2"]),
  ]);
  t.equal(result.interview, state.participant.interviews[0]);
  t.equal(result.pageSet, state.survey.pageSets[0]);
  t.equal(result.page, state.survey.pages[0]);
  await started;
  t.end();
});

test("Insert workflow targets", async t => {
  t.plan(9);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(InsertWorkflowCommand, 0)
    .then(({ interview, pageSet, page }) => {
      t.equal(interview, state.participant.interviews[0]);
      t.equal(pageSet, state.survey.pageSets[0]);
      t.equal(page, state.survey.pages[0]);
    });
  t.equal(state.interview, state.participant.interviews[0]);
  t.equal(state.pageSet, state.survey.pageSets[0]);
  t.equal(state.page, state.survey.pages[3]);

  const command = Reflect.get(state, "pending")
    .command as InsertWorkflowCommand;
  const result = state.apply([new InterviewItem(command.namePart, ["W2"])]);
  t.equal(result.interview, state.participant.interviews[0]);
  t.equal(result.pageSet, state.survey.pageSets[0]);
  t.equal(result.page, state.survey.pages[0]);
  await started;
  t.end();
});

test("Delete workflow targets", async t => {
  t.plan(9);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(DeleteWorkflowCommand, 1, 0)
    .then(({ interview, pageSet, page }) => {
      t.equal(interview, state.participant.interviews[0]);
      t.equal(pageSet, state.survey.pageSets[0]);
      t.equal(page, state.survey.pages[0]);
    });
  t.equal(state.interview, state.participant.interviews[0]);
  t.equal(state.pageSet, state.survey.pageSets[0]);
  t.equal(state.page, state.survey.pages[3]);

  const result = state.apply([]);
  t.equal(result.interview, state.participant.interviews[0]);
  t.equal(result.pageSet, state.survey.pageSets[0]);
  t.equal(result.page, state.survey.pages[0]);
  await started;
  t.end();
});

test("Update survey options targets", async t => {
  t.plan(9);
  const { survey, participant } = buildTestSurvey();
  const state = new ParticipantState(
    new SurveyState(survey),
    participant
  ).getState(participant.interviews[1]);

  const started = state
    .start(UpdateSurveyOptionsCommand, 0)
    .then(({ interview, pageSet, page }) => {
      t.equal(interview, state.participant.interviews[0]);
      t.equal(pageSet, state.survey.pageSets[0]);
      t.equal(page, state.survey.pages[0]);
    });
  t.equal(state.interview, state.participant.interviews[0]);
  t.equal(state.pageSet, state.survey.pageSets[0]);
  t.equal(state.page, state.survey.pages[3]);

  const command = Reflect.get(state, "pending")
    .command as UpdateSurveyOptionsCommand;
  const result = state.apply([
    new InterviewItem(command.defaultLangPart, "fr"),
  ]);
  t.equal(result.interview, state.participant.interviews[0]);
  t.equal(result.pageSet, state.survey.pageSets[0]);
  t.equal(result.page, state.survey.pages[0]);
  await started;
  t.end();
});
