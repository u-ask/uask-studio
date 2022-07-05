import { SurveyBuilder, IPageBuilder, mlstring } from "uask-dom";

export function libDeletePage(
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
    .comment("{.studioPage}");

  if (section) builder.endSection();

  return builder;
}
