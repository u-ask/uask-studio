import { SurveyBuilder, mlstring, IPageBuilder } from "uask-dom";

export function libDeleteItem(
  b: SurveyBuilder,
  name: string,
  section?: mlstring
): IPageBuilder {
  const builder = b.page(name);
  if (section) builder.startSection(section);
  builder
    .question("", "__INFO_DELETION__", b.types.info)
    .translate("en", "Are you sure you want to delete this element ?")
    .translate("fr", "Êtes-vous sûr de vouloir supprimer cet élément ?")
    .comment("{.studio.studioItem}");

  if (section) builder.endSection();

  return builder;
}
