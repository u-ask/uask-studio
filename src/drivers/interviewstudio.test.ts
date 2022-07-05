import sinon from "sinon";
import {
  DomainCollection,
  Interview,
  InterviewItem,
  ItemTypes,
  MutableParticipant,
  MutableSurvey,
  PageItem,
  Survey,
} from "uask-dom";
import { exampleParticipants, exampleSurvey } from "uask-dom/example";
import { IInterviewDriver, ISurveyDriver, PartialInterview } from "uask-sys";
import test from "tape";
import { ParticipantState, SurveyState } from "../state/index.js";
import { InterviewStudioDriver } from "./interviewstudio.js";
import { SurveyStudioDriver } from "./surveystudio.js";
import { completeInterview } from "../commands/test-utils.js";
import {
  IMutationCommand,
  UpdateItemCommand,
  InsertPageCommand,
  InsertPageSetCommand,
  NullCommand,
} from "../commands/index.js";

const save = sinon.fake(() =>
  Promise.resolve([{ nonce: 125689 }, { items: [] }] as PartialInterview)
);

const fakeDriver: IInterviewDriver = { save };

const getSurveyByName = sinon.fake(async () => exampleSurvey);
const tagFunc = sinon.fake();
const saveSurvey = sinon.fake(
  (survey: Survey) =>
    new Promise<Partial<Survey>>(r =>
      setTimeout(() => {
        tagFunc(survey);
        r({});
      }, 300)
    )
);

const fakeSurveyDriver: ISurveyDriver = {
  getByName: getSurveyByName,
  save: saveSurvey,
};

const surveyDriver = new SurveyStudioDriver(fakeSurveyDriver);

test("Driver does neither applies command nor save survey if command not completed", async t => {
  const driver = new InterviewStudioDriver(fakeDriver, surveyDriver);
  const survey = new SurveyState(exampleSurvey);
  const participant = new ParticipantState(survey, exampleParticipants[0]);
  participant.start(NullCommand);
  const command = Reflect.get(participant, "pending")
    .command as IMutationCommand;
  const apply = sinon.spy(command, "apply");
  const interview = exampleParticipants[0].interviews[0];
  await driver.save(survey, participant, interview);
  t.false(apply.called);
  t.false(saveSurvey.called);
  t.end();
});

test("Driver applies command and save survey when command is completed", async t => {
  const driver = new InterviewStudioDriver(fakeDriver, surveyDriver);
  const survey = new SurveyState(exampleSurvey);
  const participant = new ParticipantState(survey, exampleParticipants[0]);
  participant.start(NullCommand);
  const command = Reflect.get(participant, "pending")
    .command as IMutationCommand;
  const apply = sinon.spy(command, "apply");
  const interview = exampleParticipants[0].interviews[0];
  const completedInterview = completeInterview(interview);
  await driver.save(survey, participant, completedInterview);
  t.true(
    apply.calledWith(
      new MutableSurvey(exampleSurvey),
      new MutableParticipant(exampleParticipants[0]),
      [...completedInterview.items]
    )
  );
  t.true(saveSurvey.calledWith(exampleSurvey));
  save.resetHistory();
  saveSurvey.resetHistory();
  t.end();
});

test("Driver throws error when an adapter is not provided", async t => {
  const driver = new InterviewStudioDriver(fakeDriver, surveyDriver);
  const survey = new SurveyState(exampleSurvey);
  const interview = exampleParticipants[0].interviews[0];
  await driver
    .save(
      exampleSurvey,
      new ParticipantState(survey, exampleParticipants[0]),
      interview
    )
    .then(() => t.fail())
    .catch(() => t.pass());
  await driver
    .save(survey, exampleParticipants[0], exampleParticipants[0].interviews[0])
    .then(() => t.fail())
    .catch(() => t.pass());
  save.resetHistory();
  saveSurvey.resetHistory();
  t.end();
});

test("Driver saves a new interview", async t => {
  const driver = new InterviewStudioDriver(fakeDriver, surveyDriver);
  const survey = new SurveyState(exampleSurvey);
  const participant = new ParticipantState(survey, exampleParticipants[0]);
  participant.start(InsertPageSetCommand);
  const command = Reflect.get(participant, "pending")
    .command as InsertPageSetCommand;
  const updateCommand = Reflect.get(command, "updateCommand");
  const interview = (participant.interview as Interview).update({
    items: DomainCollection(
      new InterviewItem(command.codePart, "PS"),
      new InterviewItem(updateCommand.typePart, "PS")
    ),
  });
  const [{ nonce }] = await driver.save(
    survey,
    participant,
    completeInterview(interview)
  );
  t.equal(nonce, 125689);
  t.equal(participant.interviews.last?.nonce, 125689);
  save.resetHistory();
  saveSurvey.resetHistory();
  t.end();
});

test("Driver does not finish to save interview before new command start", async t => {
  const driver = new InterviewStudioDriver(fakeDriver, surveyDriver);
  const survey = new SurveyState(exampleSurvey);
  const participant = new ParticipantState(survey, exampleParticipants[0]);

  const interview0 = participant.interviews[1];
  const state1 = participant.getState(interview0);

  const started = state1.start(InsertPageSetCommand);
  const command1 = Reflect.get(participant, "pending")
    .command as InsertPageSetCommand;
  const updateCommand1 = Reflect.get(command1, "updateCommand");
  const items1 = (participant.interview as Interview).update({
    items: DomainCollection(
      new InterviewItem(command1.codePart, "PS"),
      new InterviewItem(updateCommand1.typePart, "PS")
    ),
  });
  const saved = driver.save(survey, participant, completeInterview(items1));
  const interview1 = await started.then(s => s.interview as Interview);

  const state2 = participant.getState(interview1);
  state2.start(InsertPageCommand, participant.interviews.length - 1, 0);
  const interview2 = state2.interview;

  const keys2 = await saved;
  const interview3 = interview2.update(keys2);
  const index3 = participant.interviews.indexOf(interview3);

  const command2 = Reflect.get(participant, "pending")
    .command as InsertPageCommand;
  const updateCommand2 = Reflect.get(command2, "updateCommand");
  const items2 = interview3.update({
    items: DomainCollection(
      new InterviewItem(command2.codePart, "P"),
      new InterviewItem(updateCommand2.namePart, "P")
    ),
  });
  const keys3 = await driver.save(
    survey,
    participant,
    completeInterview(items2)
  );
  const interview4 = interview3.update(keys3);
  const index4 = participant.interviews.indexOf(interview4);

  t.equal(index4, index3);
  t.true(save.calledOnce);
  save.resetHistory();
  saveSurvey.resetHistory();
  t.end();
});

test("Command can apply only if apply item", t => {
  const driver = new InterviewStudioDriver(fakeDriver, surveyDriver);
  const survey = new SurveyState(exampleSurvey);
  const participant = new ParticipantState(survey, exampleParticipants[0]);

  participant.start(UpdateItemCommand, 1, 0);

  const cannotApply = driver.canApply(participant, []);
  t.false(cannotApply);
  const canApply = participant.canApply(completeInterview([]));
  t.true(canApply);
  save.resetHistory();
  saveSurvey.resetHistory();
  t.end();
});

test("Command can not apply if apply item is undefined", async t => {
  const driver = new InterviewStudioDriver(fakeDriver, surveyDriver);
  const survey = new SurveyState(exampleSurvey);
  const participant = new ParticipantState(survey, exampleParticipants[0]);

  participant.start(UpdateItemCommand, 1, 0);

  const canApply = driver.canApply(participant, [
    new InterviewItem(
      new PageItem("", "__APPLY__", ItemTypes.acknowledge),
      undefined
    ),
  ]);
  t.false(canApply);
  save.resetHistory();
  saveSurvey.resetHistory();
  t.end();
});
