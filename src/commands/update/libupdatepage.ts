import { IPageBuilder, mlstring, SurveyBuilder } from "uask-dom";

export function libUpdatePage(
  b: SurveyBuilder,
  name: string,
  section?: mlstring
): IPageBuilder {
  const builder = b.page(name);
  if (section) builder.startSection(section);
  builder
    .question("", "__PAGE_NAME__", b.types.text)
    .translate("en", "Page name :")
    .translate("fr", "Intitulé de la page :")
    .required()
    .comment("{.studioPage.multiLang}");

  if (section) builder.endSection();

  return builder;
}
