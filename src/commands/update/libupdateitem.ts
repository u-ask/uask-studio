/* eslint-disable prettier/prettier */
import { IPageBuilder, mlstring, SurveyBuilder } from "uask-dom";

type LibUpdateItemOptions = {
  section?: mlstring;
  context: boolean;
};

function isOptions(o: unknown): o is LibUpdateItemOptions {
  return (
    typeof o == "object" && o !== null && ("section" in o || "context" in o)
  );
}

export function libUpdateItem(
  b: SurveyBuilder,
  pageName: string,
  section?: mlstring
): IPageBuilder;
export function libUpdateItem(
  b: SurveyBuilder,
  pageName: string,
  options?: LibUpdateItemOptions
): IPageBuilder;
export function libUpdateItem(
  b: SurveyBuilder,
  pageName: string,
  options?: mlstring | LibUpdateItemOptions
): IPageBuilder {
  const builder = b.page(pageName);
  const section = isOptions(options) ? options.section : options;
  const context = isOptions(options) && options.context;
  const ctx =
    isOptions(options) && options.context
      ? (w: string) => ` -> ${w}`
      : (w: string) => w;
  if (section) builder.startSection(section);
  //#region section
  builder
    .question("", "__ITEM_CURRENT_SECTION__", b.types.text)
    .translate("en", "Current section:")
    .translate("fr", "Section courante :")
    .comment("{.studio.studioItem.studioSection}")
    .comment("{.studio.studioItem.disabled}")
    .question("", "__ITEM_ACK_CHANGE_SECTION__", b.types.acknowledge)
    .translate("en", "Change section?")
    .translate("fr", "Changer de section ?")
    .comment("{.studio.studioItem}")
    .question(
      "",
      "__ITEM_SECTION_ARG__",
      b.types
        .choice("one", "NONE", "NEW")
        .translate("en", "None", "New section name")
        .translate("fr", "Aucune", "Nouveau nom de section")
    )
    .translate("en", "Section:")
    .translate("fr", "Section :")
    .visibleWhen("__ITEM_ACK_CHANGE_SECTION__  == @ACK")
    .comment("{.studio.studioItem.pad}")
    .question("", "__ITEM_SECTION_NAME__", b.types.text)
    .translate("en", "Section name:")
    .translate("fr", "Titre de la section :")
    .visibleWhen("__ITEM_SECTION_ARG__ == 'NEW'")
    .comment("{.studio.studioItem.multiLang.pad}");
  //#endregion

  builder
    .question(ctx(""), "__ITEM_WORDING__", b.types.text)
    .translate("en", ctx("Question wording :"))
    .translate("fr", ctx("Intitulé de la question :"))
    .required()
    .comment("{.studio.studioItem.multiLang}")

    .question(
      ctx(""),
      "__ITEM_TYPE__",
      b.types
        .choice("one", ...getAllItemTypesName())
        .translate("en", ...getAllItemTypesLabel("en"))
        .translate("fr", ...getAllItemTypesLabel("fr"))
    )
    .translate("en", ctx("Question type :"))
    .translate("fr", ctx("Type de question :"))
    .required()
    .comment("{.studio.studioItem}")

    .question(ctx(""), "__ITEM_TYPE_ARG_DATE__", b.types.acknowledge)
    .translate("en", ctx("Incomplete date?"))
    .translate("fr", ctx("Date incomplète ?"))
    .visibleWhen("__ITEM_TYPE__ == 'date'")
    .comment("{.studio.studioItem.pad}")

    .question(ctx(""), "__ITEM_TYPE_ARG_SCALE_MIN__", b.types.integer)
    .translate("en", ctx("Minimum value"))
    .translate("fr", ctx("Valeur minimale?"))
    .visibleWhen("__ITEM_TYPE__ == 'scale'")
    .comment("{.studio.studioItem.pad}")

    .question(ctx(""), "__ITEM_TYPE_ARG_SCALE_MAX__", b.types.integer)
    .translate("en", ctx("Maximum value?"))
    .translate("fr", ctx("Valeur maximale ?"))
    .visibleWhen("__ITEM_TYPE__ == 'scale'")
    .comment("{.studio.studioItem.pad}")

    .question(ctx(""), "__ITEM_TYPE_ARG_SCORE__", b.types.integer)
    .translate("en", ctx("Choice list:"))
    .translate("fr", ctx("Liste des choix :"))
    .visibleWhen("__ITEM_TYPE__ == 'score'")
    .comment("{.studio.studioItem.studioScoreInput.pad}")

    .question(
      ctx(""),
      "__ITEM_TYPE_ARG_CHOICE_MULTIPLICITY__",
      b.types.acknowledge
    )
    .translate("en", ctx("Multiple:"))
    .translate("fr", ctx("Multiple :"))
    .visibleWhen("__ITEM_TYPE__ == 'choice'")
    .comment("{.studio.studioItem.pad}")

    .question(ctx(""), "__ITEM_TYPE_ARG_CHOICE_LIST__", b.types.text)
    .translate("en", ctx("Choice list:"))
    .translate("fr", ctx("Liste des choix :"))
    .visibleWhen("__ITEM_TYPE__ == 'choice'")
    .comment("{.studio.studioItem.studioChoiceInput.pad}")

    .question(ctx(""), "__ITEM_TYPE_ARG_TIME_DURATION__", b.types.acknowledge)
    .translate("en", ctx("Duration:"))
    .translate("fr", ctx("Durée :"))
    .visibleWhen("__ITEM_TYPE__ == 'time'")
    .comment("{.studio.studioItem.pad}")

    .info("", "__ITEM_ADVANCED_INFO__")
    .translate("en", "Advanced parameters:")
    .translate("fr", "Paramètres avancés :")
    .comment("{.studio.studioItem.title}")
    .visibleWhen("__ITEM_TYPE__ != 'info' && __ITEM_TYPE__ != 'image'")

    //#region Context
    .question("", "__ITEM_CONTEXT__", b.types.acknowledge)
    .translate("en", "Contextual question")
    .translate("fr", "Question contextuelle")
    .comment("Allow multiple wordings and / or types{.studio.studioItem}")
    .translate(
      "fr",
      "Permet plusieurs intitulés et / ou types{.studio.studioItem}"
    )
    .visibleWhen("__ITEM_TYPE__ != 'info' && __ITEM_TYPE__ != 'image'")

    .info("", "__ITEM_CONTEXT_WARN__")
    .translate("en", "Save and edit again to continue")
    .translate("fr", "Sauvegarder et éditer de nouveau pour continuer")
    .visibleWhen(`__ITEM_CONTEXT__ == ${context ? "@UNDEF" : "@ACK"}`)
    .comment("{.studio.studioItem.text-danger}")
    //#endregion

    //#region ITEM_COMPUTED
    .question("", "__ITEM_ISCOMPUTED__", b.types.acknowledge)
    .translate("en", "Computed field:")
    .translate("fr", "Champ calculé :")
    .comment("{.studio.studioItem}")
    .visibleWhen("__ITEM_TYPE__ != 'info' && __ITEM_TYPE__ != 'image'")
    .question("", "__ITEM_COMPUTED_FORMULA__", b.types.text)
    .translate("en", "Formula(*) :")
    .translate("fr", "Formule(*) :")
    .visibleWhen("__ITEM_ISCOMPUTED__  == @ACK")
    .comment(
      "((*) Syntax: && (Logical AND) ; || (Logical OR) ; == (Equality) ; != (Inequality)){.studio.studioItem.pad.formula}"
    )
    .translate(
      "fr",
      "((*) Syntaxe: && (ET logique) ; || (OU logique) ; == (Egalité) ; != (Inégalité)){.studio.studioItem.pad.formula}"
    )
    //#endregion

    //#region ITEM_DEFAULT
    .question("", "__ITEM_HASDEFAULT__", b.types.acknowledge)
    .translate("en", "Default value:")
    .translate("fr", "Valeur par défaut :")
    .activateWhen("!__ITEM_ISCOMPUTED__")
    .comment("{.studio.studioItem}")
    .question(
      "",
      "__ITEM_DEFAULT_TYPE__",
      b.types
        .choice("one", "constant", "computed", "copy")
        .translate("en", "value", "formula", "copy")
        .translate("fr", "valeur", "formule", "copie")
    )
    .translate("en", "Type:")
    .translate("fr", "Type :")
    .visibleWhen("__ITEM_HASDEFAULT__  == @ACK")
    .defaultValue("constant")
    .comment("{.studio.studioItem.pad}")
    .question("", "__ITEM_DEFAULT__", b.types.text)
    .translate("en", "Default(*) :")
    .translate("fr", "Défaut(*) :")
    .visibleWhen("__ITEM_HASDEFAULT__  == @ACK")
    .comment("{.studio.studioItem.pad.formula}")

    //#endregion

    //#region ITEM_UNIT
    .question("", "__ITEM_UNIT__", b.types.acknowledge)
    .translate("en", "Unit:")
    .translate("fr", "Unité :")
    .visibleWhen("__ITEM_TYPE__ == 'integer' || __ITEM_TYPE__ == 'real'")
    .comment("{.studio.studioItem}")
    .question("", "__ITEM_UNIT_ARG__", b.types.text)
    .translate("en", "Unit list:")
    .translate("fr", "Liste des unités :")
    .visibleWhen("__ITEM_UNIT__  == @ACK")
    .comment("{.studio.studioItem.studioUnitInput.pad}")
    .question("", "__ITEM_UNIT_ARG_EXTENDABLE__", b.types.acknowledge)
    .translate("en", "Extendable:")
    .translate("fr", "Extensible :")
    .visibleWhen("__ITEM_UNIT__  == @ACK")
    .comment("{.studio.studioItem.pad}")
    //#endregion

    //#region ITEM_COMMENT
    .question("", "__ITEM_COMMENT__", b.types.acknowledge)
    .translate("en", "Add a comment?")
    .translate("fr", "Ajouter un commentaire ?")
    .comment("{.studioItem.studio}")
    .question("", "__ITEM_COMMENT_ARG__", b.types.text)
    .translate("en", "Type your comment:")
    .translate("fr", "Entrez votre commentaire :")
    .comment("{.studio.studioItem.pad.multiLang}")
    .visibleWhen("__ITEM_COMMENT__ == @ACK")
    //#endregion

    //#region ITEM_PIN
    .question("", "__ITEM_PIN__", b.types.acknowledge)
    .translate("en", "Pin:")
    .translate("fr", "Épingle :")
    .visibleWhen(
      "__ITEM_TYPE__ != 'score' && __ITEM_TYPE__ != 'scale' && __ITEM_TYPE__ != 'info' && __ITEM_TYPE__ != 'image'"
    )
    .comment("(Pinned to the Participant list){.studio.studioItem}")
    .translate("fr", "(Épinglé à la liste des participants)")
    .question("", "ITEM_PIN_ARG__", b.types.text)
    .translate("en", "Pin's title:")
    .translate("fr", "Nom de l'épingle :")
    .visibleWhen("__ITEM_PIN__  == @ACK")
    .comment("{.studio.studioItem.pad.multiLang}")
    //#endregion

    //#region ITEM_KPI
    .question("", "__ITEM_KPI__", b.types.acknowledge)
    .translate("en", "Display as KPI on dashboard:")
    .translate("fr", "Afficher comme KPI sur le tableau de bord")
    .visibleWhen(
      "__ITEM_TYPE__ != 'text' && __ITEM_TYPE__ != 'date' && __ITEM_TYPE__ != 'info' && __ITEM_TYPE__ != 'image'"
    )
    .comment("{.studio.studioItem}")
    .question("", "__ITEM_KPI_ARG__", b.types.text)
    .translate("en", "KPI's title:")
    .translate("fr", "Titre du KPI :")
    .visibleWhen("__ITEM_KPI__ == @ACK")
    .comment("{.studio.studioItem.pad.multiLang}")
    //#endregion

    .info("", "__ITEM_RULES_INFO__")
    .translate("en", "Rules to be applied to question:")
    .translate("fr", "Règles à appliquer à la question :")
    .comment("{.studio.studioItem.title}")
    .visibleWhen("__ITEM_TYPE__ != 'info'")

    //#region ITEM_RULE_REQUIRED
    .question("", "__ITEM_RULE_REQUIRED__", b.types.acknowledge)
    .translate("en", "Required:")
    .translate("fr", "Obligatoire :")
    .comment("{.studio.studioItem}")
    .visibleWhen("__ITEM_TYPE__ != 'info'")
    //#endregion

    //#region ITEM_RULE_TEXTLENGTH
    .question("", "__ITEM_RULE_TEXTLENGTH__", b.types.acknowledge)
    .translate("en", "Length:")
    .translate("fr", "Longueur :")
    .visibleWhen("__ITEM_TYPE__ == 'text'")
    .comment("{.studio.studioItem}")
    .question(
      "",
      "__ITEM_RULE_ARG_TEXTLENGTH__",
      b.types
        .choice("one", "FL", "ML")
        .translate("en", "Fixed length", "Max length")
        .translate("fr", "Longueur fixe", "Longueur maximale")
    )
    .translate("en", "Rule type:")
    .translate("fr", "Type de règle :")
    .visibleWhen("__ITEM_RULE_TEXTLENGTH__ == @ACK")
    .defaultValue("FL")
    .comment("{.studio.studioItem.pad}")
    .question("", "__ITEM_RULE_ARG_TEXTLENGTH_PREC__", b.types.integer)
    .translate("en", "Specify length:")
    .translate("fr", "Préciser la longueur :")
    .visibleWhen("__ITEM_RULE_TEXTLENGTH__ == @ACK")
    .defaultValue(10)
    .comment("{.studio.studioItem.pad}")
    //#endregion

    //#region ITEM_RULE_LETTERCASE
    .question("", "__ITEM_RULE_LETTERCASE__", b.types.acknowledge)
    .translate("en", "UPPER/lower:")
    .translate("fr", "MAJUSCULE/minuscule :")
    .visibleWhen("__ITEM_TYPE__ == 'text'")
    .comment("{.studio.studioItem}")
    .question(
      "",
      "__ITEM_RULE_ARG_LETTERCASE__",
      b.types
        .choice("one", "U", "L")
        .translate("en", "UPPER", "lower")
        .translate("fr", "MAJUSCULE", "minuscule")
    )
    .translate("en", "Specify:")
    .translate("fr", "Préciser : ")
    .visibleWhen("__ITEM_RULE_LETTERCASE__ == @ACK")
    .defaultValue("U")
    .comment("{.studio.studioItem.pad}")
    //#endregion

    //#region ITEM_RULE_DECIMALPRECISION
    .question("", "__ITEM_RULE_DECIMALPRECISION__", b.types.acknowledge)
    .translate("en", "Decimal precision:")
    .translate("fr", "Précision décimale :")
    .visibleWhen("__ITEM_TYPE__ == 'real'")
    .comment("{.studio.studioItem}")
    .question("", "__ITEM_RULE_ARG_DECPRECISION__", b.types.integer)
    .translate("en", "Number of digits:")
    .translate("fr", "Nombre de chiffres :")
    .visibleWhen("__ITEM_RULE_DECIMALPRECISION__ == @ACK")
    .comment("{.studio.studioItem.pad}")
    //#endregion

    //#region ITEM_RULE_INRANGE
    .question("", "__ITEM_RULE_INRANGE__", b.types.acknowledge)
    .translate("en", "In range:")
    .translate("fr", "Intervalle :")
    .visibleWhen(
      "__ITEM_TYPE__ == 'real' || __ITEM_TYPE__ == 'integer' || __ITEM_TYPE__ == 'date'"
    )
    .comment("{.studio.studioItem}")
    .question("", "__ITEM_RULE_ARG_INRANGE_MIN__", b.types.text)
    .translate("en", "Minimum value")
    .translate("fr", "Valeur minimale")
    .visibleWhen("__ITEM_RULE_INRANGE__ == @ACK")
    .comment("{.studio.studioItem.pad.studioInRange}")
    .question("", "__ITEM_RULE_ARG_INRANGE_MAX__", b.types.text)
    .translate("en", "Maximum value")
    .translate("fr", "Valeur maximale")
    .visibleWhen("__ITEM_RULE_INRANGE__ == @ACK")
    .comment("{.studio.studioItem.pad.studioInRange}")
    .question(
      "",
      "__ITEM_RULE_ARG_INRANGE_LIMITS__",
      b.types
        .choice("many", "L", "U")
        .translate("en", "Min.", "Max.")
        .translate("fr", "Min.", "Max.")
    )
    .translate("en", "Include limits:")
    .translate("fr", "Inclure les limites :")
    .visibleWhen("__ITEM_RULE_INRANGE__ == @ACK")
    .comment("{.studio.studioItem.pad}")

    //#region ITEM_ACTIVATION
    .question("", "__ITEM_ACTIVATION__", b.types.acknowledge)
    .translate("en", "Activation/visibility:")
    .translate("fr", "Activation/visibilité :")
    .comment("{.studio.studioItem}")
    .question(
      "",
      "__ITEM_ACTIVATION_TYPE__",
      b.types
        .choice("one", "A", "V")
        .translate("en", "Activate when", "Visible when")
        .translate("fr", "Activée si", "Visible si")
    )
    .visibleWhen("__ITEM_ACTIVATION__ == @ACK")
    .comment("{.studio.studioItem.pad}")
    .defaultValue("A")
    .question("", "__ITEM_ACTIVATION_ARG__", b.types.text)
    .translate("en", "Formula(*) :")
    .translate("fr", "Formule(*) :")
    .visibleWhen("__ITEM_ACTIVATION__ == @ACK")
    .comment(
      "((*) Syntax: && (Logical AND) ; || (Logical OR) ; == (Equality) ; != (Inequality)){.studio.studioItem.studioActivationInput.pad.formula}"
    )
    .translate(
      "fr",
      "((*) Syntaxe: && (ET logique) ; || (OU logique) ; == (Egalité) ; != (Inégalité)){.studio.studioItem.studioActivationInput.pad.formula}"
    )
    //#endregion

    //#region ITEM_RULE_CRITICAL
    .question("", "__ITEM_RULE_CRITICAL__", b.types.acknowledge)
    .translate("en", "Critical value:")
    .translate("fr", "Valeur critique :")
    .comment("{.studio.studioItem}")
    .visibleWhen("__ITEM_TYPE__ != 'info'")
    .question("", "__ITEM_RULE_CRITICAL_EVENT__", b.types.text)
    .translate("en", "Event name:")
    .translate("fr", "Nom de l'évènement :")
    .visibleWhen("__ITEM_RULE_CRITICAL__")
    .required()
    .comment("{.studio.studioItem.pad}")
    .question("", "__ITEM_RULE_CRITICAL_MESSAGE__", b.types.text)
    .translate("en", "Message:")
    .translate("fr", "Message :")
    .visibleWhen("__ITEM_RULE_CRITICAL__")
    .comment("{.studio.studioItem.pad.multiline}")
    .question("", "__ITEM_RULE_CRITICAL_TRIGGER__", b.types.text)
    .translate("en", "Trigger:")
    .translate("fr", "Déclencheur :")
    .visibleWhen("__ITEM_RULE_CRITICAL__")
    .comment("{.studio.studioItem.pad.formula}");
  //#endregion

  if (section) builder.endSection();

  return builder;
}

const allItemTypes = [
  { name: "text", en: "Text", fr: "Texte" },
  { name: "real", en: "Real", fr: "Nombre à virgule" },
  { name: "integer", en: "Integer", fr: "Entier" },
  { name: "yesno", en: "Yes/No", fr: "Oui/Non" },
  { name: "acknowledge", en: "Checkbox", fr: "Case à cocher" },
  { name: "date", en: "Date", fr: "Date" },
  { name: "scale", en: "Scale", fr: "Echelle" },
  { name: "score", en: "Score", fr: "Score" },
  { name: "choice", en: "Choice", fr: "Choix" },
  { name: "info", en: "Info", fr: "Info" },
  { name: "image", en: "Image", fr: "Image" },
  { name: "time", en: "Time", fr: "Temps" },
];

function getAllItemTypesName() {
  return allItemTypes.map(type => (type as Record<string, string>).name);
}

function getAllItemTypesLabel(lang: string) {
  return allItemTypes.map(type => (type as Record<string, string>)[lang]);
}
