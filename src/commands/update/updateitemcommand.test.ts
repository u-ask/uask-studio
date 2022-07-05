/* eslint-disable @typescript-eslint/no-empty-function */
import {
  MutableSurvey,
  SurveyBuilder,
  InterviewItem,
  PageItem,
  ItemTypes,
  DateType,
  TextType,
  ChoiceType,
  ScaleType,
  getItem,
  Metadata,
  ParticipantBuilder,
  MutableParticipant,
  Survey,
  Participant,
  IDomainCollection,
  ContextType,
  YesNoType,
  Rules,
  getScopedItem,
} from "uask-dom";
import test from "tape";
import { IMutationCommand } from "../command.js";
import { getStudioItems, isConsistent } from "../test-utils.js";
import { parseRangeValue, UpdateItemCommand } from "./updateitemcommand.js";

function buildTestSurvey() {
  const b = new SurveyBuilder();
  b.pageSet("Visit1").pages("P1");
  b.page("P1")
    .startSection("section 1")
    .question("NUMBER", "NUMBER", b.types.real)
    .required()
    .inRange(0, 5, { includeLower: true, includeUpper: true })
    .unit("U1", "U2")
    .extendable()
    .kpi("kpi title")
    .question("TEXT", "TEXT", b.types.text)
    .defaultValue(b.computed("NUMBER + '0'"))
    .pin("pin title")
    .letterCase("upper")
    .translate("en", "Question 2 (English)")
    .translate("fr", "Question 2 (Français)")
    .activateWhen("NUMBER", 1)
    .critical("C", "CC", b.computed("TEXT == 'A'"))
    .comment("(This is a comment)<left|right>{.class}")
    .translate("fr", "(Ceci est un commentaire)<gauche|droite>{.class}")
    .endSection()
    .question("COMP_DATE", "COMP_DATE", b.types.date())
    .question("INCOMP_DATE", "INCOMP_DATE", b.types.date(true))
    .question("SCALE", "SCALE", b.types.scale(0, 5))
    .defaultValue(2)
    .question(
      "SCORE",
      "SCORE",
      b.types
        .score(1, 12, 34, 48, 55)
        .wording("1", "12", "34", "48", "55")
        .translate("fr", "1", "12", "34", "48", "55")
    )
    .defaultValue(b.copy("SCALE"))
    .question(
      "SINGLE_CHOICE",
      "SINGLE_CHOICE",
      b.types
        .choice("one", "C1", "C2")
        .wording("choice1", "choice2")
        .translate("fr", "choix1", "choix2")
    )
    .question(
      "MULTIPLE_CHOICE",
      "MULTIPLE_CHOICE",
      b.types
        .choice("many", "C1", "C2")
        .wording("choice1", "choice2")
        .translate("fr", "choix1", "choix2")
    )
    .question("Computed question:", "COMPUTED", ItemTypes.yesno)
    .computed("COMPUTED ? !!COMPUTED : @ACK")
    .visibleWhen("SCORE == 12")
    .question(
      "CTX",
      b.types.yesno,
      b.types.choice("one", "A", "B"),
      b.types.date(true),
      b.types.scale(1, 5),
      b.types.score(1, 3).wording("A", "B")
    )
    .wordings("Context 1", "Context 2")
    .translate("fr", "Contexte 1", "Contexte 2");
  const survey = b.get();
  const pb = new ParticipantBuilder(survey);
  pb.interview(survey.pageSets[0])
    .item("NUMBER")
    .value(1.0)
    .item("COMP_DATE")
    .value(new Date())
    .item("INCOMP_DATE")
    .value("2022-06")
    .item("SCALE")
    .value(3)
    .item("SCORE")
    .value(34)
    .item("SINGLE_CHOICE")
    .value("C2")
    .item("MULTIPLE_CHOICE")
    .value(["C1"])
    .item("COMPUTED")
    .value(true)
    .item("CTX")
    .context(1)
    .value("A");
  const participant = pb.build();
  return { survey, participant };
}

test("start update item command", t => {
  const { mutableSurvey, mutableParticipant } = startCommand(0, 0);
  const items = mutableSurvey.value.pages[0].items;
  t.true(items.find(i => getItem(i).variableName == "__ITEM_WORDING__"));
  t.true(items.find(i => getItem(i).variableName == "__ITEM_TYPE__"));
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Starting update does not change target item #383", t => {
  const { context, mutableParticipant } = startCommand();
  t.equal(
    mutableParticipant.interviews[0].items[0],
    context.participant.interviews[0].items[0]
  );
  const interviewItems = context.studioItems();
  t.false(interviewItems.includes(mutableParticipant.interviews[0].items[0]));
  t.end();
});

test("Interview items for update item command", t => {
  const { context } = startCommand();
  const interviewItems = context.studioItems();
  t.equal(interviewItems[0].value, "NUMBER");
  t.equal(interviewItems[1].value, ItemTypes.real.name);
  t.end();
});

test("apply update item command", t => {
  const { context } = startCommand();
  const { mutableSurvey, mutableParticipant } = applyCommand(context, [
    new InterviewItem(context.command.wordingPart, "new wording"),
    new InterviewItem(context.command.typePart, "text"),
  ]);
  const newItem = getItem(mutableSurvey.pageSets[0].items[0]);
  const newInterviewItem = mutableParticipant.interviews[0].items[0];
  t.equal(newItem.wording, "new wording");
  t.true(newItem.type instanceof TextType);
  t.equal(getItem(newInterviewItem), newItem);
  t.true(isConsistent(mutableSurvey, mutableParticipant));
  t.end();
});

test("Update item type to incomplete date", t => {
  const { context } = startCommand();
  const argDateIncomplete = context.command.argDatePart;
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.typePart, "date"),
    new InterviewItem(argDateIncomplete, false),
  ]);
  const newItem = mutableSurvey.value.pages[0].items[0] as PageItem;
  const type = newItem.type;
  if (type instanceof DateType) t.false(type.incomplete);
  else t.fail("Should be a date type");
  t.end();
});

test("Update item type to choice", t => {
  const { context } = startCommand();
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.typePart, "choice"),
    new InterviewItem(context.command.argMultiplicityChoicePart, undefined),
    new InterviewItem(context.command.argChoicesPart, [
      { name: "C1", label: { en: "choice1", fr: "choix1" } },
      { name: "C2", label: { en: "choice2", fr: "choix2" } },
      { name: "C3", label: { en: "choice3", fr: "choix3" } },
    ]),
  ]);
  const newItem = mutableSurvey.value.pages[0].items[0] as PageItem;
  const type = newItem.type;
  if (type instanceof ChoiceType) {
    t.equal(type.multiplicity, "one");
    t.deepEqual(type.choices, ["C1", "C2", "C3"]);
    t.deepLooseEqual(type.labels, [
      { en: "choice1", fr: "choix1" },
      { en: "choice2", fr: "choix2" },
      { en: "choice3", fr: "choix3" },
    ]);
  } else t.fail("Should be a choice type");
  t.end();
});

test("Start command on computed", t => {
  const { context } = startCommand(0, 8);
  const interviewItems = context.studioItems();
  const isComputedValue = interviewItems.find(
    i => i.pageItem == context.command.isComputedPart
  )?.value;
  const computedFormula = interviewItems.find(
    i => i.pageItem == context.command.computedFormulaPart
  )?.value;
  t.true(isComputedValue);
  t.equals(computedFormula, "COMPUTED ? !!COMPUTED : @ACK");
  t.end();
});

test("Change item to computed", t => {
  const { context } = startCommand();
  const formula = "SCORE + 10";
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.isComputedPart, true),
    new InterviewItem(context.command.computedFormulaPart, formula),
  ]);
  const newItem = mutableSurvey.value.pages[0].items[0] as PageItem;
  const rule = mutableSurvey.crossRules.find(
    r => r.is("computed") && r.target == newItem
  );
  if (rule) {
    t.equal(rule.args.formula, "$1 + 10");
    t.equals(rule.pageItems.length, 2);
  } else {
    t.fail("Rule not found");
  }
  t.end();
});

test("Get interviewItems command on visibleWhen with computed condition", t => {
  const { context } = startCommand(0, 8);
  const interviewItems = context.studioItems();
  const hasActivationCondition = interviewItems.find(
    i => i.pageItem == context.command.isActivablePart
  )?.value;
  const activationConditionType = interviewItems.find(
    i => i.pageItem == context.command.activationConditionTypePart
  )?.value;
  const activationConditionArg = interviewItems.find(
    i => i.pageItem == context.command.activationConditionArgPart
  )?.value;
  t.true(hasActivationCondition);
  t.equals(activationConditionType, "V");
  t.equals(activationConditionArg, "SCORE == 12");
  t.end();
});

test("Start command on computed default", t => {
  const { context } = startCommand(0, 1);
  const interviewItems = context.studioItems();
  const hasDefault = interviewItems.find(
    i => i.pageItem == context.command.hasDefaultPart
  )?.value;
  const defaultType = interviewItems.find(
    i => i.pageItem == context.command.defaultTypePart
  )?.value;
  const defaultValue = interviewItems.find(
    i => i.pageItem == context.command.defaultPart
  )?.value;
  t.true(hasDefault);
  t.equal(defaultType, "computed");
  t.equal(defaultValue, "NUMBER + '0'");
  t.end();
});

test("Start command on coopy default", t => {
  const { context } = startCommand(0, 5);
  const interviewItems = context.studioItems();
  const hasDefault = interviewItems.find(
    i => i.pageItem == context.command.hasDefaultPart
  )?.value;
  const defaultType = interviewItems.find(
    i => i.pageItem == context.command.defaultTypePart
  )?.value;
  const defaultValue = interviewItems.find(
    i => i.pageItem == context.command.defaultPart
  )?.value;
  t.true(hasDefault);
  t.equal(defaultType, "copy");
  t.equal(defaultValue, "SCALE");
  t.end();
});

test("Start command on constant default", t => {
  const { context } = startCommand(0, 4);
  const interviewItems = context.studioItems();
  const hasDefault = interviewItems.find(
    i => i.pageItem == context.command.hasDefaultPart
  )?.value;
  const defaultType = interviewItems.find(
    i => i.pageItem == context.command.defaultTypePart
  )?.value;
  const defaultValue = interviewItems.find(
    i => i.pageItem == context.command.defaultPart
  )?.value;
  t.true(hasDefault);
  t.equal(defaultType, "constant");
  t.equal(defaultValue, 2);
  t.end();
});

test("Change computed default to constant", t => {
  const { context } = startCommand(0, 1);
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.defaultTypePart, "constant"),
    new InterviewItem(context.command.defaultPart, "HELLO"),
  ]);
  t.deepEqual(mutableSurvey.items[1].defaultValue, Rules.constant("HELLO"));
  t.end();
});

test("Change computed default to computed", t => {
  const { context } = startCommand(0, 4);
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.defaultTypePart, "computed"),
    new InterviewItem(context.command.defaultPart, "NUMBER + 2"),
  ]);
  t.true(
    mutableSurvey.crossRules.some(
      r =>
        r.target == mutableSurvey.items[4] &&
        r.name == "computed" &&
        r.when == "initialization" &&
        r.args.formula == "$1 + 2"
    )
  );
  t.end();
});

test("Change computed default to copy", t => {
  const { context } = startCommand(0, 4);
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.defaultTypePart, "copy"),
    new InterviewItem(context.command.defaultPart, "NUMBER"),
  ]);
  t.true(
    mutableSurvey.crossRules.some(
      r =>
        r.target == mutableSurvey.items[4] &&
        r.name == "copy" &&
        r.when == "initialization" &&
        getScopedItem(r.pageItems[0]).variableName == "NUMBER"
    )
  );
  t.end();
});

test("Get interviewItems command on activateWhen with values boolean in condition", t => {
  const { context } = startCommand(0, 1);
  const interviewItems = context.studioItems();
  const hasActivationCondition = interviewItems.find(
    i => i.pageItem == context.command.isActivablePart
  )?.value;
  const activationConditionType = interviewItems.find(
    i => i.pageItem == context.command.activationConditionTypePart
  )?.value;
  const activationConditionArg = interviewItems.find(
    i => i.pageItem == context.command.activationConditionArgPart
  )?.value;
  t.true(hasActivationCondition);
  t.equals(activationConditionType, "A");
  t.equals(activationConditionArg, "NUMBER == 1");
  t.end();
});

test("Update item to item conditional activation", t => {
  const { context } = startCommand();
  const condition = "SCORE == 12";
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.isActivablePart, true),
    new InterviewItem(context.command.activationConditionTypePart, "A"),
    new InterviewItem(context.command.activationConditionArgPart, condition),
  ]);
  const newItem = mutableSurvey.value.pages[0].items[0] as PageItem;
  const rule = mutableSurvey.crossRules.find(
    r => r.target == newItem && r.args.underlyingRule == "activation"
  );
  if (rule) {
    t.equal((rule.args.extraArgs as unknown[])[0] as string, "enable");
    t.true(rule.args.formula);
  } else {
    t.fail("Activation rule not found");
  }
  t.end();
});

test("Update item type to scale", t => {
  const { context } = startCommand();
  const argScaleMin = context.command.argMinScalePart;
  const argScaleMax = context.command.argMaxScalePart;
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.typePart, "scale"),
    new InterviewItem(argScaleMin, 1),
    new InterviewItem(argScaleMax, 4),
  ]);
  const newItem = mutableSurvey.value.pages[0].items[0] as PageItem;
  const type = newItem.type;
  if (type instanceof ScaleType) {
    t.equal(type.min, 1);
    t.equal(type.max, 4);
  } else t.fail("Should be a scale type");
  t.end();
});

test("Start item command on complete date input", t => {
  const { context } = startCommand(0, 2);
  const interviewItems = context.studioItems();
  t.equal(interviewItems[0].value, "COMP_DATE");
  t.equal(interviewItems[1].value, ItemTypes.date().name);
  t.equal(interviewItems[2].value, undefined);
  t.end();
});

test("Start item command on incomplete date input", t => {
  const { context } = startCommand(0, 3);
  const interviewItems = context.studioItems();
  t.equal(interviewItems[0].value, "INCOMP_DATE");
  t.equal(interviewItems[1].value, ItemTypes.date().name);
  t.equal(interviewItems[2].value, 1);
  t.end();
});

test("Start item command on scale input", t => {
  const { context } = startCommand(0, 4);
  const interviewItems = context.studioItems();
  t.equal(interviewItems[0].value, "SCALE");
  t.equal(interviewItems[1].value, "scale");
  t.equal(interviewItems[4].value, 0);
  t.equal(interviewItems[5].value, 5);
  t.end();
});

test("Start item command on commented input", t => {
  const { context } = startCommand(0, 1);
  const interviewItems = context.studioItems();
  t.equal(
    interviewItems.find(i => i.pageItem == context.command.commentPart)?.value,
    1
  );
  t.deepEqual(
    interviewItems.find(i => i.pageItem == context.command.argCommentPart)
      ?.value,
    {
      en: "(This is a comment)<left|right>{.class}",
      fr: "(Ceci est un commentaire)<gauche|droite>{.class}",
    }
  );
  t.end();
});

test("Start item command on score input", t => {
  const { context } = startCommand(0, 5);
  const interviewItems = context.studioItems();
  t.equal(interviewItems[0].value, "SCORE");
  t.equal(interviewItems[1].value, "score");
  const scores = interviewItems.find(i =>
    i.pageItem.isInstanceOf(context.command.argScorePart)
  )?.value;
  t.deepLooseEqual(scores, [
    { score: 1, label: { __code__: "1", en: "1", fr: "1" } },
    { score: 12, label: { __code__: "12", en: "12", fr: "12" } },
    { score: 34, label: { __code__: "34", en: "34", fr: "34" } },
    { score: 48, label: { __code__: "48", en: "48", fr: "48" } },
    { score: 55, label: { __code__: "55", en: "55", fr: "55" } },
  ]);
  t.end();
});

test("Start item command on single choice input", t => {
  const { context } = startCommand(0, 6);
  const interviewItems = context.studioItems();
  t.equal(interviewItems[0].value, "SINGLE_CHOICE");
  t.equal(interviewItems[1].value, "choice");
  t.equal(interviewItems[7].value, undefined);
  const choices = interviewItems.find(i =>
    i.pageItem.isInstanceOf(context.command.argChoicesPart)
  )?.value;
  t.deepLooseEqual(choices, [
    { name: "C1", label: { __code__: "C1", en: "choice1", fr: "choix1" } },
    { name: "C2", label: { __code__: "C2", en: "choice2", fr: "choix2" } },
  ]);
  t.end();
});

test("Start item command on single choice input", t => {
  const { context } = startCommand(0, 7);
  const interviewItems = context.studioItems();
  t.equal(interviewItems[0].value, "MULTIPLE_CHOICE");
  t.equal(interviewItems[1].value, "choice");
  t.equal(interviewItems[7].value, 1);
  const choices = interviewItems.find(i =>
    i.pageItem.isInstanceOf(context.command.argChoicesPart)
  )?.value;
  t.deepLooseEqual(choices, [
    { name: "C1", label: { __code__: "C1", en: "choice1", fr: "choix1" } },
    { name: "C2", label: { __code__: "C2", en: "choice2", fr: "choix2" } },
  ]);
  t.end();
});

test("Start command on required pageitem", t => {
  const { context } = startCommand();
  const interviewItems = context.studioItems();
  t.equal(
    interviewItems.find(i => i.pageItem == context.command.requiredRulePart)
      ?.value,
    1
  );
  t.end();
});

test("Apply a required rule on not required PageItem", t => {
  const { context } = startCommand(0, 1);
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.wordingPart, "new wording"),
    new InterviewItem(context.command.typePart, "text"),
    new InterviewItem(context.command.requiredRulePart, true),
    new InterviewItem(context.command.applyPart, true),
  ]);
  const metadata = new Metadata(
    mutableSurvey.value.pages[0].items[1] as PageItem,
    mutableSurvey.rules
  );
  t.true(metadata.required);
  t.end();
});

test("Apply text length rules", t => {
  const { context } = startCommand(0, 1);
  const { mutableSurvey: mutable1 } = applyCommand(context, [
    new InterviewItem(context.command.textLengthPart, true),
    new InterviewItem(context.command.textLengthArgPart, "FL"),
    new InterviewItem(context.command.textLengthArgPrecisionPart, 3),
  ]);
  const metadata = new Metadata(
    mutable1.value.pages[0].items[1] as PageItem,
    mutable1.rules
  );
  t.equal(metadata.fixedLength, 3);
  const { mutableSurvey: mutable2 } = applyCommand(context, [
    new InterviewItem(context.command.textLengthPart, true),
    new InterviewItem(context.command.textLengthArgPart, "ML"),
    new InterviewItem(context.command.textLengthArgPrecisionPart, 2),
  ]);
  const newMetadata = new Metadata(
    mutable2.value.pages[0].items[1] as PageItem,
    mutable2.rules
  );
  t.equal(newMetadata.maxLength, 2);
  t.end();
});

test("Apply a decimal precision rule", t => {
  const { context } = startCommand();
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.decimalPart, true),
    new InterviewItem(context.command.decimalArgPart, 3),
  ]);
  const metadata = new Metadata(
    mutableSurvey.value.pages[0].items[0] as PageItem,
    mutableSurvey.rules
  );
  t.equal(metadata.precision, 3);
  t.end();
});

test("Start command on lettercased (upper) pageitem", t => {
  const { context } = startCommand(0, 1);
  const interviewItems = context.studioItems();
  t.equal(
    interviewItems.find(i => i.pageItem == context.command.letterCaseRulePart)
      ?.value,
    1
  );
  t.equal(
    interviewItems.find(
      i => i.pageItem == context.command.letterCaseRuleArgPart
    )?.value,
    "U"
  );
  t.end();
});

test("Start command on inRange pageitem", t => {
  const { context } = startCommand();
  const interviewItems = context.studioItems();
  t.equal(
    interviewItems.find(i => i.pageItem == context.command.inRangePart)?.value,
    1
  );
  t.equal(
    interviewItems.find(i => i.pageItem == context.command.inRangeMinArgPart)
      ?.value,
    "0"
  );
  t.equal(
    interviewItems.find(i => i.pageItem == context.command.inRangeMaxArgPart)
      ?.value,
    "5"
  );
  t.deepEqual(
    interviewItems.find(i => i.pageItem == context.command.inRangeLimitsArgPart)
      ?.value,
    ["L", "U"]
  );
  t.end();
});

test("Parse range value", t => {
  const rangeValue1 = "5";
  t.equal(parseRangeValue(rangeValue1), 5);
  const rangeValue2 = "2020-06-24";
  t.deepEqual(parseRangeValue(rangeValue2), new Date("2020-06-24"));
  t.end();
});

test("Update item to item with units", t => {
  const { context } = startCommand();
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.unitPart, true),
    new InterviewItem(context.command.argUnitPart, ["ml", "L"]),
    new InterviewItem(context.command.extendableUnitPart, true),
  ]);
  const item = mutableSurvey.value.pages[0].items[0] as PageItem;
  t.equal(item.units?.values?.length, 2);
  t.true((item.units as { isExtendable: boolean }).isExtendable);
  t.end();
});

test("Get interviewItems command on item with units", t => {
  const { context } = startCommand();
  const interviewItems = context.studioItems();
  const unit = interviewItems.find(
    i => i.pageItem == context.command.unitPart
  )?.value;
  const unitList = interviewItems.find(
    i => i.pageItem == context.command.argUnitPart
  )?.value;
  const extandableUnit = interviewItems.find(
    i => i.pageItem == context.command.extendableUnitPart
  )?.value;
  t.true(unit);
  t.deepEquals(unitList, ["U1", "U2"]);
  t.true(extandableUnit);
  t.end();
});

test("Update item to pinned item", t => {
  const { context } = startCommand();
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.isPinnedPart, true),
    new InterviewItem(context.command.pinTitlePart, "pin1"),
  ]);
  const item = mutableSurvey.value.pages[0].items[0] as PageItem;
  t.equals(item.pin, "pin1");
  t.end();
});

test("Update item to kpied item #239", t => {
  const { context } = startCommand();
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.isKpiPart, true),
    new InterviewItem(context.command.kpiTitlePart, "kpi1"),
  ]);
  const item = mutableSurvey.value.pages[0].items[0] as PageItem;
  t.equal(item.kpi, "kpi1");
  t.end();
});

test("Get interviewItems command on kpied item #239", t => {
  const { context } = startCommand(0, 0);
  const interviewItems = context.studioItems();
  const isKpied = interviewItems.find(
    i => i.pageItem == context.command.isKpiPart
  )?.value;
  const kpi = interviewItems.find(
    i => i.pageItem == context.command.kpiTitlePart
  )?.value;
  t.true(isKpied);
  t.equals(kpi, "kpi title");
  t.end();
});

test("Get interviewItems command on pinned item", t => {
  const { context } = startCommand(0, 1);
  const interviewItems = context.studioItems();
  const isPinned = interviewItems.find(
    i => i.pageItem == context.command.isPinnedPart
  )?.value;
  const pin = interviewItems.find(
    i => i.pageItem == context.command.pinTitlePart
  )?.value;
  t.true(isPinned);
  t.equals(pin, "pin title");
  t.end();
});

test("get default interview items for activation rule", t => {
  const { context } = startCommand(0, 1);
  const interviewItems = context.studioItems();
  t.equal(
    interviewItems.find(
      ii => ii.pageItem == context.command.activationConditionTypePart
    )?.value,
    "A"
  );
  t.end();
});

test("Update item to item with critical rule", t => {
  const { context } = startCommand();
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.isCriticalPart, 1),
    new InterviewItem(context.command.criticalEventPart, "ae"),
    new InterviewItem(
      context.command.criticalTriggerPart,
      "NUMBER == 2 || NUMBER == 3"
    ),
    new InterviewItem(context.command.criticalMessagePart, undefined),
  ]);
  const item = mutableSurvey.value.pages[0].items[0] as PageItem;
  const dynamic = item.rules.find(r => r.name == "dynamic") as unknown as {
    underlyingRule: string;
    formula: string;
  };
  t.equal(dynamic.underlyingRule, "critical");
  t.deepEqual(dynamic.formula, ["['ae','ae',$1 == 2 || $1 == 3]", 1]);
  t.end();
});

test("Update item to item with critical rule with no trigger", t => {
  const { context } = startCommand();
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.isCriticalPart, 1),
    new InterviewItem(context.command.criticalEventPart, "ae"),
    new InterviewItem(context.command.criticalTriggerPart, undefined),
    new InterviewItem(context.command.criticalMessagePart, undefined),
  ]);
  const item = mutableSurvey.value.pages[0].items[0] as PageItem;
  const rule = item.rules.find(r => r.name == "critical") as unknown as {
    event: string;
    values: unknown[];
  };
  t.equal(rule?.event, "ae");
  t.equal(rule?.values.length, 0);
  t.end();
});

test("Update item to item with critical rule with message #399", t => {
  const { context } = startCommand();
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.isCriticalPart, 1),
    new InterviewItem(context.command.criticalEventPart, "ae"),
    new InterviewItem(context.command.criticalTriggerPart, undefined),
    new InterviewItem(context.command.criticalMessagePart, "Adverse event."),
  ]);
  const item = mutableSurvey.value.pages[0].items[0] as PageItem;
  const rule = item.rules.find(r => r.name == "critical") as unknown as {
    event: string;
    message: string;
    values: unknown[];
  };
  t.deepEqual(rule?.event, "ae");
  t.deepEqual(rule?.message, "Adverse event.");
  t.equal(rule?.values.length, 0);
  t.end();
});

test("Get item defaults for critical rule", t => {
  const { context } = startCommand(0, 1);
  const interviewItems = context.studioItems();
  t.equal(
    interviewItems.find(i => i.pageItem == context.command.isCriticalPart)
      ?.value,
    1
  );
  t.equal(
    interviewItems.find(i => i.pageItem == context.command.criticalEventPart)
      ?.value,
    "C"
  );
  t.equal(
    interviewItems.find(i => i.pageItem == context.command.criticalTriggerPart)
      ?.value,
    "TEXT == 'A'"
  );
  t.equal(
    interviewItems.find(i => i.pageItem == context.command.criticalMessagePart)
      ?.value,
    "CC"
  );
  t.end();
});

test("Get section name for item in section #337", t => {
  const { context } = startCommand();
  const interviewItems = context.studioItems();
  t.equal(
    interviewItems.find(i => i.pageItem == context.command.sectionCurrentPart)
      ?.value,
    "section 1"
  );
  t.end();
});

test("Get section name for item not in section #337", t => {
  const { context } = startCommand(0, 4);
  const interviewItems = context.studioItems();
  t.deepEqual(
    interviewItems.find(i => i.pageItem == context.command.sectionCurrentPart)
      ?.value,
    { en: "None", fr: "Aucune" }
  );
  t.end();
});

test("Update item not in section to item in section named #337", t => {
  const { context } = startCommand(0, 4);
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.sectionAckChangePart, true),
    new InterviewItem(context.command.sectionArgPart, "NEW"),
    new InterviewItem(context.command.sectionNamePart, "section 1"),
  ]);
  const item = mutableSurvey.value.pages[0].items[4] as PageItem;
  t.equals(item.section, "section 1");
  t.end();
});

test("Update item in section to item not in section #337", t => {
  const { context } = startCommand(0, 1);
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(context.command.sectionAckChangePart, true),
    new InterviewItem(context.command.sectionArgPart, "NONE"),
  ]);
  const item = mutableSurvey.value.pages[0].items[1] as PageItem;
  t.equals(item.section, undefined);
  t.end();
});

test("Update contextual item wording #386", t => {
  const { context } = startCommand(0, 9);
  const interviewItems = context.studioItems();
  const wording = interviewItems.filter(i =>
    i.pageItem.isInstanceOf(context.command.wordingPart)
  );
  t.deepLooseEqual(
    wording.map(i => i.value),
    [
      { en: "Context 1", fr: "Contexte 1" },
      { en: "Context 2", fr: "Contexte 2" },
      { en: "Context 1", fr: "Contexte 1" },
      { en: "Context 2", fr: "Contexte 2" },
      { en: "Context 1", fr: "Contexte 1" },
    ]
  );
  const newWordings = [
    { en: "Context #1", fr: "Contexte #1" },
    { en: "Context #2", fr: "Contexte #2" },
    { en: "Context #1", fr: "Contexte #1" },
    { en: "Context #2", fr: "Contexte #2" },
    { en: "Context #1", fr: "Contexte #1" },
  ];

  const { mutableSurvey } = applyCommand(context, [
    ...wording.map((w, x) =>
      w.update({
        value: newWordings[x],
      })
    ),
  ]);
  const pageItem = mutableSurvey.items.find(
    i => i.variableName == "CTX"
  ) as PageItem;
  t.deepEqual(pageItem.wording, newWordings);
  t.end();
});

test("Contextual item type part items are multiple instances #386", t => {
  const { context } = startCommand(0, 9);
  const interviewItems = context.studioItems();
  const types = interviewItems.filter(i =>
    i.pageItem.isInstanceOf(context.command.typePart)
  );
  t.deepLooseEqual(
    types.map(i => i.value),
    ["yesno", "choice", "date", "scale", "score"]
  );
  const choices = interviewItems.filter(i =>
    i.pageItem.isInstanceOf(context.command.argChoicesPart)
  );
  t.deepLooseEqual(
    choices.map(i => i.value),
    [
      undefined,
      [
        { name: "A", label: { __code__: "A", en: "A" } },
        { name: "B", label: { __code__: "B", en: "B" } },
      ],
      undefined,
      undefined,
      undefined,
    ]
  );
  const dateFormat = interviewItems.filter(i =>
    i.pageItem.isInstanceOf(context.command.argDatePart)
  );
  t.deepLooseEqual(
    dateFormat.map(i => i.value),
    [undefined, undefined, true, undefined, undefined]
  );
  const scaleMin = interviewItems.filter(i =>
    i.pageItem.isInstanceOf(context.command.argMinScalePart)
  );
  t.deepLooseEqual(
    scaleMin.map(i => i.value),
    [undefined, undefined, undefined, 1, undefined]
  );
  const scaleMax = interviewItems.filter(i =>
    i.pageItem.isInstanceOf(context.command.argMaxScalePart)
  );
  t.deepLooseEqual(
    scaleMax.map(i => i.value),
    [undefined, undefined, undefined, 5, undefined]
  );
  const scores = interviewItems.filter(i =>
    i.pageItem.isInstanceOf(context.command.argScorePart)
  );
  t.deepLooseEqual(
    scores.map(i => i.value),
    [
      undefined,
      undefined,
      undefined,
      undefined,
      [
        { score: 1, label: { __code__: "1", en: "A" } },
        { score: 3, label: { __code__: "3", en: "B" } },
      ],
    ]
  );
  t.end();
});

test("Modification of contextual item type #386", t => {
  const { context } = startCommand(0, 9);
  const interviewItems = context.studioItems();
  const types = interviewItems.filter(i =>
    i.pageItem.isInstanceOf(context.command.typePart)
  );
  const scaleMax = interviewItems.filter(i =>
    i.pageItem.isInstanceOf(context.command.argMaxScalePart)
  );
  const { mutableSurvey } = applyCommand(context, [
    new InterviewItem(types[4].pageItem.nextInstance(), "integer"),
    ...scaleMax.map(i => (i.value == 5 ? i.update({ value: 6 }) : i)),
  ]);
  const ctx = mutableSurvey.items.find(i => i.variableName == "CTX")
    ?.type as ContextType;
  t.equal((ctx[3] as ScaleType).max, 6);
  t.equal(ctx[5].name, "integer");
  t.end();
});

test("Toggle to contextual type #386", t => {
  const { context } = startCommand(0, 8);
  const interviewItems = context.studioItems();
  const ctx = interviewItems.find(
    i => i.pageItem == context.command.contextPart
  ) as InterviewItem;
  t.equal(ctx.value, undefined);
  const { mutableSurvey } = applyCommand(context, [
    ctx?.update({ value: true }),
  ]);
  const item = mutableSurvey.items.find(
    i => i.variableName == "COMPUTED"
  ) as PageItem;
  t.deepEqual(item.wording, ["Computed question:"]);
  t.ok(item.type instanceof ContextType);
  t.end();
});

test("Toggle to not contextual type #386", t => {
  const { context } = startCommand(0, 9);
  const interviewItems = context.studioItems();
  const ctx = interviewItems.find(
    i => i.pageItem == context.command.contextPart
  ) as InterviewItem;
  t.equal(ctx.value, 1);
  const { mutableSurvey } = applyCommand(context, [
    ctx?.update({ value: undefined }),
  ]);
  const item = mutableSurvey.items.find(
    i => i.variableName == "CTX"
  ) as PageItem;
  t.deepEqual(item.wording, { en: "Context 1", fr: "Contexte 1" });
  t.ok(item.type instanceof YesNoType);
  t.end();
});

function startCommand(pageIndex = 0, index = 0) {
  const { survey, participant } = buildTestSurvey();
  const command = new UpdateItemCommand();
  const mutableSurvey = new MutableSurvey(survey);
  const mutableParticipant = new MutableParticipant(participant);
  command.start(mutableSurvey, mutableParticipant, pageIndex, index);
  const context = { command, survey, participant };
  const studioItems = () => getStudioItems(mutableParticipant, participant);
  return {
    context: { ...context, studioItems },
    mutableSurvey,
    mutableParticipant,
  };
}

function applyCommand(
  context: {
    command: IMutationCommand;
    survey: Survey;
    participant: Participant;
    studioItems: () => IDomainCollection<InterviewItem>;
  },
  items: InterviewItem[]
) {
  const allItems = [
    ...items,
    ...context
      .studioItems()
      .filter(i => !items.some(t => t.pageItem == i.pageItem)),
  ];
  const mutableSurvey = new MutableSurvey(context.survey);
  const mutableParticipant = new MutableParticipant(context.participant);
  context.command.apply(mutableSurvey, mutableParticipant, allItems);
  return { mutableSurvey, mutableParticipant };
}
