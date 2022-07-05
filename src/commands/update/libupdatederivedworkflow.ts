import {
  GlossaryType,
  IPageBuilder,
  Metadata,
  mlstring,
  Survey,
  SurveyBuilder,
} from "uask-dom";
import { mlChoices } from "./mlchoices.js";

export function libUpdateDerivedWorkflow(
  b: SurveyBuilder,
  name: string,
  survey: Survey,
  section?: mlstring
): IPageBuilder {
  const builder = b.page(name);
  if (section) builder.startSection(section);
  const pageSetChoices = derivedWorkflowPageSetChoices(b, survey);
  const notificationChoices = b.types.choice(
    "many",
    ...survey.items
      .map(i => new Metadata(i, survey.rules).critical as string)
      .filter(c => !!c)
      .sort()
      .filter((ev, x, arr) => x == 0 || arr[x - 1] != ev)
  );
  builder
    .question("", "__WORKFLOW_WITH_PAGESETS__", pageSetChoices)
    .translate("en", "Visits included:")
    .translate("fr", "Visites inclues : ")
    .comment("{.studioWorkflow.studioPageSetSelector.no-ordering}")
    .question("", "__WORKFLOW_NOTIFICATIONS__", notificationChoices)
    .translate("en", "Notifications:")
    .translate("fr", "Notifications : ")
    .comment("{.studioWorkflow}");
  if (section) builder.endSection();
  return builder;
}

function derivedWorkflowPageSetChoices(
  b: SurveyBuilder,
  survey: Survey
): GlossaryType {
  return mlChoices(
    b,
    "many",
    survey.pageSets.map(p => p.type),
    survey.options
  );
}
