import sinon from "sinon";
import { isDomainProxy } from "uask-dom";
import { exampleSurvey } from "uask-dom/example";
import { ISurveyDriver } from "uask-sys";
import test from "tape";
import { SurveyState } from "../state/index.js";
import { SurveyStudioDriver } from "./surveystudio.js";

const getByName = sinon.spy(async () => exampleSurvey);
const save = sinon.spy();

const fakeDriver: ISurveyDriver = { getByName, save };

test("Survey studio driver returns a SurveyAdapter", async t => {
  const driver = new SurveyStudioDriver(fakeDriver);
  const survey = await driver.getByName("P11-05");
  if (isDomainProxy(survey)) t.equal(survey.value, exampleSurvey);
  else t.fail();
  t.true(getByName.called);
  t.end();
});

test("Survey studio driver save adaptee", async t => {
  const driver = new SurveyStudioDriver(fakeDriver);
  await driver.save(new SurveyState(exampleSurvey));
  t.true(save.calledWith(exampleSurvey));
  t.end();
});

test("Survey studio throws error when adapter not provided", async t => {
  const driver = new SurveyStudioDriver(fakeDriver);
  await driver
    .save(exampleSurvey)
    .then(() => t.fail())
    .catch(() => t.pass());
  t.end();
});
