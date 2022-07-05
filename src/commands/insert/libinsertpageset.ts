import { SurveyBuilder, mlstring, IPageBuilder } from "uask-dom";

export function libInsertPageSet(
  b: SurveyBuilder,
  name: string,
  section?: mlstring
): IPageBuilder {
  const builder = b.page(name);
  if (section) builder.startSection(section);
  builder
    .question("", "__PAGE_SET_CODE__", b.types.text)
    .translate("en", "Code:")
    .translate("fr", "Code :")
    .comment("{.studioPageSet}")
    .letterCase("upper")
    .required();

  if (section) builder.endSection();

  return builder;
}
