import {
  getTranslation,
  GlossaryType,
  IDomainCollection,
  mlstring,
  SurveyBuilder,
  SurveyOptions,
} from "uask-dom";

export function mlChoices(
  b: SurveyBuilder,
  multiplicity: "one" | "many",
  names: IDomainCollection<mlstring>,
  options: SurveyOptions
): GlossaryType {
  let pageChoices = b.types.glossary(
    multiplicity,
    ...names.map(
      name =>
        getTranslation(name, "__code__", options.defaultLang ?? "en") as string
    )
  );
  for (const lang of options.languages ?? [options.defaultLang ?? "en"])
    pageChoices = pageChoices.translate(
      lang,
      ...names.map(name => getTranslation(name, lang) as string)
    );
  return pageChoices;
}
