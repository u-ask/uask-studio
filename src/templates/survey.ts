import { Survey, SurveyBuilder } from "uask-dom";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SurveyTemplate extends Survey {}

export class SurveyTemplate {
  constructor(name: string) {
    const b = new SurveyBuilder();
    b.strict();
    b.options({
      languages: ["en", "fr"],
      defaultLang: "en",
    });
    b.workflow().home("SYNT").initial("INC");
    b.survey(name)
      .pageSet("SYNT")
      .translate("en", "Synthesis")
      .translate("fr", "Synthèse")
      .pages("SYNT")
      .pageSet("INC")
      .translate("en", "Inclusion visit")
      .translate("fr", "Visite d'inclusion")
      .pages("INC");
    b.page("SYNT").translate("en", "Synthesis").translate("fr", "Synthèse");
    b.page("INC")
      .translate("en", "Inclusion")
      .translate("fr", "Inclusion")
      .question(
        "Is this participant included",
        "__INCLUDED",
        b.types.acknowledge
      )
      .translate("fr", "Ce participant est-il inclus ?")
      .question("Inclusion date", "INCDATE", b.types.date())
      .translate("fr", "Date d'inclusion")
      .defaultValue(b.computed("@TODAY"))
      .required()
      .pin("Inclusion")
      .translate("fr", "Inclusion");
    return b.get();
  }
}
