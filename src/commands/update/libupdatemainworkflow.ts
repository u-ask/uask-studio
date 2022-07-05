import {
  GlossaryType,
  IPageBuilder,
  mlstring,
  Survey,
  SurveyBuilder,
} from "uask-dom";
import { mlChoices } from "./mlchoices.js";

export function libUpdateMainWorkflow(
  b: SurveyBuilder,
  name: string,
  survey: Survey,
  section?: mlstring
): IPageBuilder {
  const builder = b.page(name);
  const pageSetChoices = mainWorkflowPageSetChoices(b, survey);
  if (section) builder.startSection(section);
  builder
    .question("", "__WORKFLOW_INITIAL__", pageSetChoices)
    .translate("en", "Initial visits : ")
    .translate("fr", "Visites initiales : ")
    .comment("{.studioWorkflow.studioPageSetSelector}")
    .question("", "__WORKFLOW_FOLLOWUP__", pageSetChoices)
    .translate("en", "Follow up visits : ")
    .translate("fr", "Visites de suivi : ")
    .comment("{.studioWorkflow.studioPageSetSelector}")
    .question("", "__WORKFLOW_AUXILIARY__", pageSetChoices)
    .translate("en", "Auxiliary visits/exams : ")
    .translate("fr", "Visites/Examens auxiliaires : ")
    .comment("{.studioWorkflow.studioPageSetSelector}")
    .question("", "__WORKFLOW_END__", pageSetChoices)
    .translate("en", "Ending visit : ")
    .translate("fr", "Visite de fin : ")
    .comment("{.studioWorkflow.studioPageSetSelector}")
    .question(
      "",
      "__WORKFLOW_PROCESS__",
      b.types.choice(
        "one",
        "input",
        "input // signature",
        "input => signature",
        "input // signature // query // checking",
        "input // query // checking",
        "input // query // checking => signature",
        "input // signature => input // query // checking",
        "input => signature => input // query // checking"
      )
    )
    .translate("en", "Processes: ")
    .translate("fr", "Process : ")
    .comment("{.studioWorkflow.column}");
  if (section) builder.endSection();
  return builder;
}

function mainWorkflowPageSetChoices(
  b: SurveyBuilder,
  survey: Survey
): GlossaryType {
  return mlChoices(
    b,
    "many",
    survey.pageSets.filter(p => p != survey.mainWorkflow.info).map(p => p.type),
    survey.options
  );
}
