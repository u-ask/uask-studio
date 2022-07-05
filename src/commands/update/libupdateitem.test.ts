import {
  acknowledgeItem,
  ChoiceType,
  getScopedItem,
  getTranslation,
  mlstring,
  SurveyBuilder,
  undefinedItem,
} from "uask-dom";
import test from "tape";
import { libUpdateItem } from "./libupdateitem.js";

test("Add update item wording information to survey parts", t => {
  const b = new SurveyBuilder();
  libUpdateItem(b, "updateItem");
  const parts = b.get();
  t.true(parts.items.find(i => i.variableName == "__ITEM_WORDING__"));
  t.end();
});

test("Add update item type information to survey parts", t => {
  const b = new SurveyBuilder();
  libUpdateItem(b, "updateItem");
  const parts = b.get();
  const typePart = parts.items.find(i => i.variableName == "__ITEM_TYPE__");
  t.equal(typePart?.variableName, "__ITEM_TYPE__");
  t.equal(typePart?.type.name, "choice");
  const type = typePart?.type as ChoiceType;
  t.equal(type.choices[0], "text");
  t.equal(type.label("text", "fr"), "Texte");
  t.equal(type.label("text", "en"), "Text");
  t.end();
});

test("Add update item type args to survey parts", t => {
  const b = new SurveyBuilder();
  libUpdateItem(b, "updateItem");
  const parts = b.get();
  const argsPartsVariableNames = [
    "__ITEM_TYPE_ARG_DATE__",
    "__ITEM_TYPE_ARG_SCALE_MIN__",
    "__ITEM_TYPE_ARG_SCALE_MAX__",
    "__ITEM_TYPE_ARG_SCORE__",
    "__ITEM_TYPE_ARG_CHOICE_MULTIPLICITY__",
    "__ITEM_TYPE_ARG_CHOICE_LIST__",
    "__ITEM_KPI__",
    "__ITEM_TYPE_ARG_TIME_DURATION__",
    "__ITEM_COMMENT__",
    "__ITEM_COMMENT_ARG__",
  ];
  t.true(
    argsPartsVariableNames.every(a =>
      parts.items.find(i => a == i.variableName)
    )
  );
  t.end();
});

test("Add update item kpi args to survey parts #239", t => {
  const b = new SurveyBuilder();
  libUpdateItem(b, "updateItem");
  const parts = b.get();
  const argsPartsVariableNames = ["__ITEM_KPI__", "__ITEM_KPI_ARG__"];
  t.true(
    argsPartsVariableNames.every(a =>
      parts.items.find(i => a == i.variableName)
    )
  );
  t.end();
});

test("Add update item computed information to survey parts", t => {
  const b = new SurveyBuilder();
  libUpdateItem(b, "updateItem");
  const parts = b.get();
  const computedInformation = [
    "__ITEM_ISCOMPUTED__",
    "__ITEM_COMPUTED_FORMULA__",
  ].every(part => parts.items.find(i => i.variableName == part));
  t.true(computedInformation);
  t.end();
});

test("Add update item critical parts", t => {
  const b = new SurveyBuilder();
  libUpdateItem(b, "updateItem");
  const parts = b.get();
  const computedInformation = [
    "__ITEM_RULE_CRITICAL__",
    "__ITEM_RULE_CRITICAL_EVENT__",
    "__ITEM_RULE_CRITICAL_TRIGGER__",
    "__ITEM_RULE_CRITICAL_MESSAGE__",
  ].every(part => parts.items.find(i => i.variableName == part));
  t.true(computedInformation);
  t.end();
});

test("Add update item section parts #337", t => {
  const b = new SurveyBuilder();
  libUpdateItem(b, "updateItem");
  const parts = b.get();
  const computedInformation = [
    "__ITEM_CURRENT_SECTION__",
    "__ITEM_ACK_CHANGE_SECTION__",
    "__ITEM_SECTION_ARG__",
    "__ITEM_SECTION_NAME__",
  ].every(part => parts.items.find(i => i.variableName == part));
  t.true(computedInformation);
  t.end();
});

test("Contextual items have recordset parts #386", t => {
  const b = new SurveyBuilder();
  libUpdateItem(b, "CTX", { context: true });
  const parts = b.get();
  const mustBeContextual = parts.items.filter(
    i =>
      i.variableName == "__ITEM_WORDING__" ||
      i.variableName.startsWith("__ITEM_TYPE_")
  );
  t.true(mustBeContextual.length > 2);
  t.true(
    mustBeContextual.every(i =>
      getTranslation(i.wording as mlstring)?.startsWith(" -> ")
    )
  );
  t.end();
});

test("Contextual items have a single recordset #386", t => {
  const b = new SurveyBuilder();
  libUpdateItem(b, "CTX", { context: true });
  const parts = b.get();
  const contextual = parts.items
    .map((i, x) => <const>[x, i])
    .filter(([, i]) =>
      getTranslation(i.wording as mlstring)?.startsWith(" -> ")
    )
    .map(([x]) => x);
  t.true(contextual.every((x, y, arr) => y == 0 || arr[y - 1] == x - 1));
  t.end();
});

test("Item toggle to contextual #386", t => {
  const b = new SurveyBuilder();
  libUpdateItem(b, "TOCTX");
  const parts = b.get();
  const context = parts.items.find(
    i => i.variableName == "__ITEM_CONTEXT__" && i.type.name == "acknowledge"
  );
  const contextWarning = parts.items.find(
    i => i.variableName == "__ITEM_CONTEXT_WARN__" && i.type.name == "info"
  );
  t.ok(context && contextWarning);
  const showWarning = parts.rules.find(r => r.target == contextWarning);
  t.deepLooseEqual(showWarning?.pageItems.map(getScopedItem), [
    acknowledgeItem,
    context,
    contextWarning,
  ]);
  t.end();
});

test("Item toggle to non contextual #386", t => {
  const b = new SurveyBuilder();
  libUpdateItem(b, "TOCTX", { context: true });
  const parts = b.get();
  const context = parts.items.find(
    i => i.variableName == "__ITEM_CONTEXT__" && i.type.name == "acknowledge"
  );
  const contextWarning = parts.items.find(
    i => i.variableName == "__ITEM_CONTEXT_WARN__" && i.type.name == "info"
  );
  t.ok(context && contextWarning);
  const showWarning = parts.rules.find(r => r.target == contextWarning);
  t.deepLooseEqual(showWarning?.pageItems.map(getScopedItem), [
    undefinedItem,
    context,
    acknowledgeItem,
    contextWarning,
  ]);
  t.end();
});
