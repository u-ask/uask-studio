import { IPageBuilder, mlstring, Survey, SurveyBuilder } from "uask-dom";
import { mlChoices } from "./mlchoices.js";

export function libUpdatePageSet(
  b: SurveyBuilder,
  name: string,
  survey: Survey,
  section?: mlstring
): IPageBuilder {
  const builder = b.page(name);
  if (section) builder.startSection(section);
  const pageChoices = mlChoices(
    b,
    "many",
    survey.pages
      .filter(p => !survey.mainWorkflow.info?.pages.includes(p))
      .map(p => p.name),
    survey.options
  );
  builder
    .question("", "__PAGE_SET_NAME__", b.types.text)
    .translate("en", "Name :")
    .translate("fr", "Intitulé :")
    .required()
    .comment("{.studioPageSet.multiLang}")
    .question("", "__PAGE_SET_DATEVAR__", b.types.text)
    .translate("en", "Date variable :")
    .translate("fr", "Variable de date :")
    .letterCase("upper")
    .comment("{.studioPageSet}")
    .question("", "__PAGE_SET_PAGES__", pageChoices)
    .translate("en", "Pages : ")
    .translate("fr", "Pages : ")
    .comment("{.studioPageSet.studioPageSelector}");
  if (section) builder.endSection();
  return builder;
}
