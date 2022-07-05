import { IPageBuilder, mlstring, Survey, SurveyBuilder } from "uask-dom";

export function libInsertDerivedWorkflow(
  b: SurveyBuilder,
  name: string,
  survey: Survey,
  section?: mlstring
): IPageBuilder {
  const builder = b.page(name);
  if (section) builder.startSection(section);
  builder
    .question(
      "",
      "__WORKFLOW_NAME__",
      b.types
        .choice(
          "many",
          "participant",
          "administrator",
          "investigator",
          "dataadministrator",
          "surveycoordinator",
          "cst",
          "cra",
          "datamanager",
          "deo"
        )
        .translate(
          "en",
          "Participant",
          "Administrator",
          "Investigator",
          "Data Administrator",
          "Survey Coordinator",
          "Clinical Survey Technician (CST)",
          "Clinical Research associate (CRA)",
          "Data Manager",
          "Data entry operator"
        )
        .translate(
          "fr",
          "Participant",
          "Administrateur",
          "Investigateur",
          "Administrateur Données",
          "Coordinateur d'Etude",
          "Technicien d'étude clinique (TEC)",
          "Associé Recherche Clinique (ARC)",
          "Data Manager",
          "Opérateur de saisie"
        )
    )
    .translate("en", "Workflow associated role :")
    .translate("fr", "Role associé au workflow :")
    .required()
    .comment("{.studioWorkflow.column}")
    .question("", "__WORKFLOW_SPECIFIER__", b.types.text)
    .translate("en", "Specifier : ")
    .translate("fr", "Spécificateur : ")
    .comment("{.studioWorkflow}");
  if (section) builder.endSection();
  return builder;
}
