import sinon from "sinon";
import { isDomainProxy } from "uask-dom";
import {
  exampleParticipants,
  exampleSamples,
  exampleSurvey,
} from "uask-dom/example";
import { IParticipantDriver } from "uask-sys";
import test from "tape";
import { ParticipantStudioDriver } from "./participantstudio.js";
import { ParticipantState, SurveyState } from "../state/index.js";

const getByParticipantCode = sinon.spy(async () => exampleParticipants[0]);
const save = sinon.spy();
const fakeDriver: IParticipantDriver = {
  getAll: sinon.fake(),
  getBySample: sinon.fake(),
  getByParticipantCode,
  save,
};

test("Participant studio driver returns stateful objects", async t => {
  const driver = new ParticipantStudioDriver(fakeDriver);
  const participant = await driver.getByParticipantCode(
    new SurveyState(exampleSurvey),
    exampleSamples,
    "00001"
  );
  if (isDomainProxy(participant))
    t.equal(participant.value, exampleParticipants[0]);
  else t.fail();
  t.end();
});

test("Participant studio driver get throws error when an adapter is not provided", async t => {
  const driver = new ParticipantStudioDriver(fakeDriver);
  await driver
    .getByParticipantCode(exampleSurvey, exampleSamples, "00001")
    .then(() => t.fail())
    .catch(() => t.pass());
  t.end();
});

test("Participant studio driver save adaptee", async t => {
  const driver = new ParticipantStudioDriver(fakeDriver);
  const survey = new SurveyState(exampleSurvey);
  await driver.save(
    survey,
    new ParticipantState(survey, exampleParticipants[0])
  );
  t.true(save.calledWith(exampleSurvey, exampleParticipants[0]));
  t.end();
});

test("Participant studio save throws error when an adapter is not provided", async t => {
  const driver = new ParticipantStudioDriver(fakeDriver);
  const survey = new SurveyState(exampleSurvey);
  await driver
    .save(exampleSurvey, new ParticipantState(survey, exampleParticipants[0]))
    .then(() => t.fail())
    .catch(() => t.pass());
  await driver
    .save(survey, exampleParticipants[0])
    .then(() => t.fail())
    .catch(() => t.pass());
  t.end();
});
