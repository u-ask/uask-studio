import {
  IPageBuilder,
  Item,
  mlstring,
  SurveyBuilder,
  TableContent,
} from "uask-dom";

export function libInsertTableLine(
  b: SurveyBuilder,
  name: string,
  section?: mlstring,
  table?: TableContent<Item>
): IPageBuilder {
  const builder = b.page(name);
  if (section) builder.startSection(section);
  builder
    .question("__TITLE__", b.types.text)
    .translate("en", "Add a table line")
    .translate("fr", "Ajouter une ligne en tableau")
    .comment("{.studio.studioItemTarget}")
    .question("__LINE_POSITION__", b.types.integer)
    .translate("en", "Line position")
    .translate("fr", "Position de la ligne")
    .comment("{.studio.studioItem}")
    .inRange(1, table ? table.items.length + 1 : 1)
    .question("__LINE_NAME__", b.types.text)
    .translate("en", "Table line name : ")
    .translate("fr", "Nom de la ligne : ")
    .required()
    .comment("{.studio.studioItem.multiLang}")
    .question("__COLUMN_NAMES__", b.types.text)
    .translate("en", "Columns : ")
    .translate("fr", "Colonnes : ")
    .required()
    .comment("{.studio.studioItem.studioChoiceInput.variableName}");

  if (section) builder.endSection();

  return builder;
}
