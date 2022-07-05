import { IPageBuilder, mlstring, SurveyBuilder } from "uask-dom";

export function libInsertPage(
  b: SurveyBuilder,
  name: string,
  section?: mlstring
): IPageBuilder {
  const builder = b.page(name);
  if (section) builder.startSection(section);
  builder
    .question("", "__PAGE_CODE__", b.types.text)
    .translate("en", "Code:")
    .translate("fr", "Code :")
    .comment("{.studioPage}")
    .letterCase("upper")
    .required();

  if (section) builder.endSection();

  return builder;
}
