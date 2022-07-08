import {
  getItem,
  getTranslation,
  IPageBuilder,
  ISectionBuilder,
  mlstring,
  Page,
  Survey,
  SurveyBuilder,
} from "uask-dom";
import { mlChoices } from "./mlchoices.js";

export function libIncludePage(
  b: SurveyBuilder,
  name: string,
  survey: Survey,
  section?: mlstring
): IPageBuilder {
  const builder = b.page(name);
  if (section) builder.startSection(section);
  builder
    .question("", "__INCLUDE__", b.types.yesno)
    .translate("en", "Include an existing page?")
    .translate("fr", "Inclure une page existante ?")
    .defaultValue(0)
    .comment("{.studioPage}");

  const includeList = survey.pages.filter(
    p => !survey.mainWorkflow.info.pages.includes(p)
  );
  const pageChoices = mlChoices(
    b,
    "one",
    includeList.map(p => p.name),
    survey.options
  );
  builder
    .question("", "__INCLUDE_PAGE__", pageChoices)
    .translate("en", "Page:")
    .translate("fr", "Page :")
    .required()
    .visibleWhen("__INCLUDE__")
    .comment("{.studioPage.pad}");

  for (const page of includeList) buildQuestionSelector(b, builder, page);

  builder
    .question("", "__INCLUDE_CONTEXT__", b.types.integer)
    .translate("en", "Context:")
    .translate("fr", "Contexte :")
    .visibleWhen("__INCLUDE__")
    .inRange(1, 9)
    .comment("{.studioPage.pad}");

  return builder.endSection();
}

function buildQuestionSelector(
  b: SurveyBuilder,
  builder: IPageBuilder | ISectionBuilder,
  page: Page
) {
  const code = getTranslation(page.name, "__code__");
  const variableName = `__INCLUDE_SELECT_${code}__`;
  const itemChoices = b.types.glossary(
    "many",
    ...page.items.map(i => getItem(i).variableName)
  );
  builder
    .question("", variableName, itemChoices)
    .translate("en", "Variables:")
    .translate("fr", "Variables :")
    .visibleWhen(`__INCLUDE__ && __INCLUDE_PAGE__=='${code}'`)
    .comment("{.studioPage.pad}");
}
