import { SurveyBuilder, IPageBuilder, mlstring, ItemTypes } from "uask-dom";

export function libDeletePageSet(
  b: SurveyBuilder,
  name: string,
  section?: mlstring
): IPageBuilder {
  const builder = b.page(name);
  if (section) builder.startSection(section);
  builder
    .question("", "__INFO_DELETION__", b.types.info)
    .translate("en", "Are you sure you want to delete this element ?")
    .translate("fr", "Etes vous sur de vouloir supprimer cet élément ?")
    .comment("{.studioPageSet}");

  if (section) builder.endSection();

  return builder;
}
