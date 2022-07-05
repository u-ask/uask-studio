import { SurveyBuilder, IPageBuilder, mlstring } from "uask-dom";

export function libInsertItem(
  b: SurveyBuilder,
  name: string,
  section?: mlstring
): IPageBuilder {
  const builder = b.page(name);
  if (section) builder.startSection(section);
  builder
    .question("__ITEM_VARIABLE_NAME__", b.types.text)
    .translate("en", "Variable name : ")
    .translate("fr", "Nom de la variable : ")
    .required()
    .letterCase("upper")
    .comment("{.studio.studioItem}")
    .question("__ITEM_ISRECORD__", b.types.acknowledge)
    .translate("en", "Multiple records:")
    .translate("fr", "Enregistrements multiples :")
    .comment("{.studio.studioItem}");

  if (section) builder.endSection();

  return builder;
}
