import { SurveyBuilder, getItem, Metadata, ContextType, ScoreType, ChoiceType, hasPivot, DomainCollection, InterviewItem, ItemTypes, getTranslation, Library, setMessageIf, update, CrossItemRule, Scope, execute, getScopedItem, getScope, Rules, isML, parseLayout, DomainProxy, MutableSurvey, MutableParticipant, isDomainProxy, ParticipantBuilder } from 'uask-dom';
import { workflowSerialize, workflowDeserialize, SummaryGenericDriver } from 'uask-sys';

class NullCommand {
    constructor() {
        this.pageSetIndex = 0;
    }
    start() { }
    apply() { }
    canApply() {
        return true;
    }
}
function allRequiredSet(pageItems, interviewItems) {
    return allSet(pageItems, interviewItems, "required");
}
function allUniqueSet(pageItems, interviewItems) {
    return allSet(pageItems, interviewItems, "unique");
}
function allSet(pageItems, interviewItems, ruleName) {
    return interviewItems.every(p => !pageItems.includes(p.pageItem) || !(ruleName in p.messages));
}
function allInRangeSet(parts, interviewItems) {
    return allSet(parts, interviewItems, "unique");
}

function libApply(b, name, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
    builder
        .question("", "__APPLY__", b.types.acknowledge)
        .translate("en", "Save changes?")
        .translate("fr", "Sauvegarder les modifications ?")
        .comment("{.studio.studioApply}");
    if (section)
        builder.endSection();
    return builder;
}
function getApplyItem(interviewItems) {
    return interviewItems.find(i => i.pageItem.variableName == "__APPLY__");
}

function isOptions(o) {
    return (typeof o == "object" && o !== null && ("section" in o || "context" in o));
}
function libUpdateItem(b, pageName, options) {
    const builder = b.page(pageName);
    const section = isOptions(options) ? options.section : options;
    const context = isOptions(options) && options.context;
    const ctx = isOptions(options) && options.context
        ? (w) => ` -> ${w}`
        : (w) => w;
    if (section)
        builder.startSection(section);
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
        .question("", "__ITEM_SECTION_ARG__", b.types
        .choice("one", "NONE", "NEW")
        .translate("en", "None", "New section name")
        .translate("fr", "Aucune", "Nouveau nom de section"))
        .translate("en", "Section:")
        .translate("fr", "Section :")
        .visibleWhen("__ITEM_ACK_CHANGE_SECTION__  == @ACK")
        .comment("{.studio.studioItem.pad}")
        .question("", "__ITEM_SECTION_NAME__", b.types.text)
        .translate("en", "Section name:")
        .translate("fr", "Titre de la section :")
        .visibleWhen("__ITEM_SECTION_ARG__ == 'NEW'")
        .comment("{.studio.studioItem.multiLang.pad}");
    builder
        .question(ctx(""), "__ITEM_WORDING__", b.types.text)
        .translate("en", ctx("Question wording :"))
        .translate("fr", ctx("Intitulé de la question :"))
        .required()
        .comment("{.studio.studioItem.multiLang}")
        .question(ctx(""), "__ITEM_TYPE__", b.types
        .choice("one", ...getAllItemTypesName())
        .translate("en", ...getAllItemTypesLabel("en"))
        .translate("fr", ...getAllItemTypesLabel("fr")))
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
        .question(ctx(""), "__ITEM_TYPE_ARG_CHOICE_MULTIPLICITY__", b.types.acknowledge)
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
        .question("", "__ITEM_CONTEXT__", b.types.acknowledge)
        .translate("en", "Contextual question")
        .translate("fr", "Question contextuelle")
        .comment("Allow multiple wordings and / or types{.studio.studioItem}")
        .translate("fr", "Permet plusieurs intitulés et / ou types{.studio.studioItem}")
        .visibleWhen("__ITEM_TYPE__ != 'info' && __ITEM_TYPE__ != 'image'")
        .info("", "__ITEM_CONTEXT_WARN__")
        .translate("en", "Save and edit again to continue")
        .translate("fr", "Sauvegarder et éditer de nouveau pour continuer")
        .visibleWhen(`__ITEM_CONTEXT__ == ${context ? "@UNDEF" : "@ACK"}`)
        .comment("{.studio.studioItem.text-danger}")
        .question("", "__ITEM_ISCOMPUTED__", b.types.acknowledge)
        .translate("en", "Computed field:")
        .translate("fr", "Champ calculé :")
        .comment("{.studio.studioItem}")
        .visibleWhen("__ITEM_TYPE__ != 'info' && __ITEM_TYPE__ != 'image'")
        .question("", "__ITEM_COMPUTED_FORMULA__", b.types.text)
        .translate("en", "Formula(*) :")
        .translate("fr", "Formule(*) :")
        .visibleWhen("__ITEM_ISCOMPUTED__  == @ACK")
        .comment("((*) Syntax: && (Logical AND) ; || (Logical OR) ; == (Equality) ; != (Inequality)){.studio.studioItem.pad.formula}")
        .translate("fr", "((*) Syntaxe: && (ET logique) ; || (OU logique) ; == (Egalité) ; != (Inégalité)){.studio.studioItem.pad.formula}")
        .question("", "__ITEM_HASDEFAULT__", b.types.acknowledge)
        .translate("en", "Default value:")
        .translate("fr", "Valeur par défaut :")
        .activateWhen("!__ITEM_ISCOMPUTED__")
        .comment("{.studio.studioItem}")
        .question("", "__ITEM_DEFAULT_TYPE__", b.types
        .choice("one", "constant", "computed", "copy")
        .translate("en", "value", "formula", "copy")
        .translate("fr", "valeur", "formule", "copie"))
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
        .question("", "__ITEM_COMMENT__", b.types.acknowledge)
        .translate("en", "Add a comment?")
        .translate("fr", "Ajouter un commentaire ?")
        .comment("{.studioItem.studio}")
        .question("", "__ITEM_COMMENT_ARG__", b.types.text)
        .translate("en", "Type your comment:")
        .translate("fr", "Entrez votre commentaire :")
        .comment("{.studio.studioItem.pad.multiLang}")
        .visibleWhen("__ITEM_COMMENT__ == @ACK")
        .question("", "__ITEM_PIN__", b.types.acknowledge)
        .translate("en", "Pin:")
        .translate("fr", "Épingle :")
        .visibleWhen("__ITEM_TYPE__ != 'score' && __ITEM_TYPE__ != 'scale' && __ITEM_TYPE__ != 'info' && __ITEM_TYPE__ != 'image'")
        .comment("(Pinned to the Participant list){.studio.studioItem}")
        .translate("fr", "(Épinglé à la liste des participants)")
        .question("", "ITEM_PIN_ARG__", b.types.text)
        .translate("en", "Pin's title:")
        .translate("fr", "Nom de l'épingle :")
        .visibleWhen("__ITEM_PIN__  == @ACK")
        .comment("{.studio.studioItem.pad.multiLang}")
        .question("", "__ITEM_KPI__", b.types.acknowledge)
        .translate("en", "Display as KPI on dashboard:")
        .translate("fr", "Afficher comme KPI sur le tableau de bord")
        .visibleWhen("__ITEM_TYPE__ != 'text' && __ITEM_TYPE__ != 'date' && __ITEM_TYPE__ != 'info' && __ITEM_TYPE__ != 'image'")
        .comment("{.studio.studioItem}")
        .question("", "__ITEM_KPI_ARG__", b.types.text)
        .translate("en", "KPI's title:")
        .translate("fr", "Titre du KPI :")
        .visibleWhen("__ITEM_KPI__ == @ACK")
        .comment("{.studio.studioItem.pad.multiLang}")
        .info("", "__ITEM_RULES_INFO__")
        .translate("en", "Rules to be applied to question:")
        .translate("fr", "Règles à appliquer à la question :")
        .comment("{.studio.studioItem.title}")
        .visibleWhen("__ITEM_TYPE__ != 'info'")
        .question("", "__ITEM_RULE_REQUIRED__", b.types.acknowledge)
        .translate("en", "Required:")
        .translate("fr", "Obligatoire :")
        .comment("{.studio.studioItem}")
        .visibleWhen("__ITEM_TYPE__ != 'info'")
        .question("", "__ITEM_RULE_TEXTLENGTH__", b.types.acknowledge)
        .translate("en", "Length:")
        .translate("fr", "Longueur :")
        .visibleWhen("__ITEM_TYPE__ == 'text'")
        .comment("{.studio.studioItem}")
        .question("", "__ITEM_RULE_ARG_TEXTLENGTH__", b.types
        .choice("one", "FL", "ML")
        .translate("en", "Fixed length", "Max length")
        .translate("fr", "Longueur fixe", "Longueur maximale"))
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
        .question("", "__ITEM_RULE_LETTERCASE__", b.types.acknowledge)
        .translate("en", "UPPER/lower:")
        .translate("fr", "MAJUSCULE/minuscule :")
        .visibleWhen("__ITEM_TYPE__ == 'text'")
        .comment("{.studio.studioItem}")
        .question("", "__ITEM_RULE_ARG_LETTERCASE__", b.types
        .choice("one", "U", "L")
        .translate("en", "UPPER", "lower")
        .translate("fr", "MAJUSCULE", "minuscule"))
        .translate("en", "Specify:")
        .translate("fr", "Préciser : ")
        .visibleWhen("__ITEM_RULE_LETTERCASE__ == @ACK")
        .defaultValue("U")
        .comment("{.studio.studioItem.pad}")
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
        .question("", "__ITEM_RULE_INRANGE__", b.types.acknowledge)
        .translate("en", "In range:")
        .translate("fr", "Intervalle :")
        .visibleWhen("__ITEM_TYPE__ == 'real' || __ITEM_TYPE__ == 'integer' || __ITEM_TYPE__ == 'date'")
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
        .question("", "__ITEM_RULE_ARG_INRANGE_LIMITS__", b.types
        .choice("many", "L", "U")
        .translate("en", "Min.", "Max.")
        .translate("fr", "Min.", "Max."))
        .translate("en", "Include limits:")
        .translate("fr", "Inclure les limites :")
        .visibleWhen("__ITEM_RULE_INRANGE__ == @ACK")
        .comment("{.studio.studioItem.pad}")
        .question("", "__ITEM_ACTIVATION__", b.types.acknowledge)
        .translate("en", "Activation/visibility:")
        .translate("fr", "Activation/visibilité :")
        .comment("{.studio.studioItem}")
        .question("", "__ITEM_ACTIVATION_TYPE__", b.types
        .choice("one", "A", "V")
        .translate("en", "Activate when", "Visible when")
        .translate("fr", "Activée si", "Visible si"))
        .visibleWhen("__ITEM_ACTIVATION__ == @ACK")
        .comment("{.studio.studioItem.pad}")
        .defaultValue("A")
        .question("", "__ITEM_ACTIVATION_ARG__", b.types.text)
        .translate("en", "Formula(*) :")
        .translate("fr", "Formule(*) :")
        .visibleWhen("__ITEM_ACTIVATION__ == @ACK")
        .comment("((*) Syntax: && (Logical AND) ; || (Logical OR) ; == (Equality) ; != (Inequality)){.studio.studioItem.studioActivationInput.pad.formula}")
        .translate("fr", "((*) Syntaxe: && (ET logique) ; || (OU logique) ; == (Egalité) ; != (Inégalité)){.studio.studioItem.studioActivationInput.pad.formula}")
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
    if (section)
        builder.endSection();
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
    return allItemTypes.map(type => type.name);
}
function getAllItemTypesLabel(lang) {
    return allItemTypes.map(type => type[lang]);
}

class UpdateItemCommand {
    buildParts(section, context) {
        const builder = new SurveyBuilder();
        libUpdateItem(builder, "updateItem", { section, context });
        libApply(builder, "apply", section);
        this.parts = builder.get();
    }
    get itemParts() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items;
    }
    get wordingPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_WORDING__");
    }
    get typePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_TYPE__");
    }
    get applyPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__APPLY__");
    }
    get argDatePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_TYPE_ARG_DATE__");
    }
    get argMinScalePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_TYPE_ARG_SCALE_MIN__");
    }
    get argMaxScalePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_TYPE_ARG_SCALE_MAX__");
    }
    get argScorePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_TYPE_ARG_SCORE__");
    }
    get argMultiplicityChoicePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_TYPE_ARG_CHOICE_MULTIPLICITY__");
    }
    get argChoicesPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_TYPE_ARG_CHOICE_LIST__");
    }
    get contextPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_CONTEXT__");
    }
    get requiredRulePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_REQUIRED__");
    }
    get letterCaseRulePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_LETTERCASE__");
    }
    get letterCaseRuleArgPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_ARG_LETTERCASE__");
    }
    get inRangePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_INRANGE__");
    }
    get inRangeMinArgPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_ARG_INRANGE_MIN__");
    }
    get inRangeMaxArgPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_ARG_INRANGE_MAX__");
    }
    get inRangeLimitsArgPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_ARG_INRANGE_LIMITS__");
    }
    get textLengthPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_TEXTLENGTH__");
    }
    get textLengthArgPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_ARG_TEXTLENGTH__");
    }
    get textLengthArgPrecisionPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_ARG_TEXTLENGTH_PREC__");
    }
    get decimalPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_DECIMALPRECISION__");
    }
    get decimalArgPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_ARG_DECPRECISION__");
    }
    get isComputedPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_ISCOMPUTED__");
    }
    get computedFormulaPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_COMPUTED_FORMULA__");
    }
    get hasDefaultPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_HASDEFAULT__");
    }
    get defaultTypePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_DEFAULT_TYPE__");
    }
    get defaultPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_DEFAULT__");
    }
    get isActivablePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_ACTIVATION__");
    }
    get activationConditionTypePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_ACTIVATION_TYPE__");
    }
    get activationConditionArgPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_ACTIVATION_ARG__");
    }
    get isCriticalPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_CRITICAL__");
    }
    get criticalEventPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_CRITICAL_EVENT__");
    }
    get criticalTriggerPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_CRITICAL_TRIGGER__");
    }
    get criticalMessagePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_RULE_CRITICAL_MESSAGE__");
    }
    get isPinnedPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_PIN__");
    }
    get pinTitlePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "ITEM_PIN_ARG__");
    }
    get isKpiPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_KPI__");
    }
    get kpiTitlePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_KPI_ARG__");
    }
    get unitPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_UNIT__");
    }
    get argUnitPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_UNIT_ARG__");
    }
    get extendableUnitPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_UNIT_ARG_EXTENDABLE__");
    }
    get argDurationTimePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_TYPE_ARG_TIME_DURATION__");
    }
    get commentPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_COMMENT__");
    }
    get argCommentPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_COMMENT_ARG__");
    }
    get sectionCurrentPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_CURRENT_SECTION__");
    }
    get sectionAckChangePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_ACK_CHANGE_SECTION__");
    }
    get sectionArgPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_SECTION_ARG__");
    }
    get sectionNamePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_SECTION_NAME__");
    }
    start(survey, participant, pageIndex, index) {
        var _a, _b;
        this.pageIndex = pageIndex;
        this.pageItem = getItem(survey.value.pages[pageIndex].items[index]);
        this.pageItemIndex = index;
        this.metadata = new Metadata(this.pageItem, survey.rules);
        this.hasContext =
            Array.isArray(this.pageItem.wording) ||
                this.pageItem instanceof ContextType;
        this.buildParts(this.pageItem.section, this.hasContext);
        survey.insertItems(pageIndex, index + 1, [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.crossRules]);
        participant.updatePageSets(survey.pageSets);
        participant.insertItems(this.getPartItems());
    }
    getPartItems() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30;
        const wording = this.getWording();
        const typeName = this.getTypeProps("name");
        this.coerceContext(typeName, wording);
        const dateFormat = this.getTypeProps("incomplete");
        const timeFormat = this.getTypeProps("duration");
        const scaleMin = this.getTypeProps("min");
        const scaleMax = this.getTypeProps("max");
        const scores = this.getTypeProps(t => {
            if (t instanceof ScoreType) {
                return t.scores.map((s, index) => {
                    return {
                        score: s,
                        label: t.labels[index],
                    };
                });
            }
            return undefined;
        });
        const choiceMultiplicity = this.getTypeProps(t => t.multiplicity == "many");
        const choices = this.getTypeProps(t => {
            if (t instanceof ChoiceType) {
                return t.choices.map((c, index) => {
                    return {
                        name: c,
                        label: t.labels[index],
                    };
                });
            }
            return undefined;
        });
        const hasContext = this.hasContext ? true : undefined;
        const isRequired = (_a = this.metadata) === null || _a === void 0 ? void 0 : _a.required;
        const isComputed = !!((_b = this.metadata) === null || _b === void 0 ? void 0 : _b.computed);
        const formula = (_c = this.metadata) === null || _c === void 0 ? void 0 : _c.computed;
        const hasDefault = !!((_d = this.metadata) === null || _d === void 0 ? void 0 : _d.default);
        const defaultValue = (_e = this.metadata) === null || _e === void 0 ? void 0 : _e.default;
        const defaultType = (_f = this.metadata) === null || _f === void 0 ? void 0 : _f.defaultType;
        const letterCase = ((_g = this.metadata) === null || _g === void 0 ? void 0 : _g.letterCase) != undefined;
        const letterCaseName = ((_h = this.metadata) === null || _h === void 0 ? void 0 : _h.letterCase) == "lower"
            ? "L"
            : ((_j = this.metadata) === null || _j === void 0 ? void 0 : _j.letterCase) == "upper"
                ? "U"
                : undefined;
        const isInRange = ((_k = this.metadata) === null || _k === void 0 ? void 0 : _k.min) instanceof Date
            ? (_m = (_l = this.metadata) === null || _l === void 0 ? void 0 : _l.min) === null || _m === void 0 ? void 0 : _m.toLocaleDateString("sv")
            : (_p = (_o = this.metadata) === null || _o === void 0 ? void 0 : _o.min) === null || _p === void 0 ? void 0 : _p.toString();
        const inRangeMax = ((_q = this.metadata) === null || _q === void 0 ? void 0 : _q.max) instanceof Date
            ? (_s = (_r = this.metadata) === null || _r === void 0 ? void 0 : _r.max) === null || _s === void 0 ? void 0 : _s.toLocaleDateString("sv")
            : (_u = (_t = this.metadata) === null || _t === void 0 ? void 0 : _t.max) === null || _u === void 0 ? void 0 : _u.toString();
        const limits = this.getLimits();
        const hasTextLength = !!((_v = this.metadata) === null || _v === void 0 ? void 0 : _v.fixedLength) || !!((_w = this.metadata) === null || _w === void 0 ? void 0 : _w.maxLength);
        const textLength = (_y = (_x = this.metadata) === null || _x === void 0 ? void 0 : _x.fixedLength) !== null && _y !== void 0 ? _y : (_z = this.metadata) === null || _z === void 0 ? void 0 : _z.maxLength;
        const textLengthBehaviour = textLength
            ? ((_0 = this.metadata) === null || _0 === void 0 ? void 0 : _0.fixedLength)
                ? "FL"
                : "ML"
            : undefined;
        const hasPrecision = !!((_1 = this.metadata) === null || _1 === void 0 ? void 0 : _1.precision);
        const precision = (_2 = this.metadata) === null || _2 === void 0 ? void 0 : _2.precision;
        const isActivable = !!((_3 = this.metadata) === null || _3 === void 0 ? void 0 : _3.activable) || !!((_4 = this.metadata) === null || _4 === void 0 ? void 0 : _4.showable);
        const activableBehaviour = ((_5 = this.metadata) === null || _5 === void 0 ? void 0 : _5.activable)
            ? "A"
            : ((_6 = this.metadata) === null || _6 === void 0 ? void 0 : _6.showable)
                ? "V"
                : undefined;
        const activableCondition = (_8 = (_7 = this.metadata) === null || _7 === void 0 ? void 0 : _7.activable) !== null && _8 !== void 0 ? _8 : (_9 = this.metadata) === null || _9 === void 0 ? void 0 : _9.showable;
        const isCritical = !!((_10 = this.metadata) === null || _10 === void 0 ? void 0 : _10.critical);
        const criticalEvent = (_12 = (_11 = this.metadata) === null || _11 === void 0 ? void 0 : _11.critical) === null || _12 === void 0 ? void 0 : _12.replace(/^'([^']*)'$/, "$1");
        const criticalMessage = (_13 = this.metadata) === null || _13 === void 0 ? void 0 : _13.notification;
        const criticalTrigger = ((_14 = this.metadata) === null || _14 === void 0 ? void 0 : _14.trigger) || undefined;
        const isPinned = !!((_15 = this.pageItem) === null || _15 === void 0 ? void 0 : _15.pin);
        const pinTitle = (_16 = this.pageItem) === null || _16 === void 0 ? void 0 : _16.pin;
        const isKpi = !!((_17 = this.pageItem) === null || _17 === void 0 ? void 0 : _17.kpi);
        const kpiTitle = hasPivot((_18 = this.pageItem) === null || _18 === void 0 ? void 0 : _18.kpi)
            ? (_19 = this.pageItem) === null || _19 === void 0 ? void 0 : _19.kpi.title
            : (_20 = this.pageItem) === null || _20 === void 0 ? void 0 : _20.kpi;
        const hasUnits = ((_22 = (_21 = this.pageItem) === null || _21 === void 0 ? void 0 : _21.units) === null || _22 === void 0 ? void 0 : _22.values).length > 0;
        const units = hasUnits ? (_24 = (_23 = this.pageItem) === null || _23 === void 0 ? void 0 : _23.units) === null || _24 === void 0 ? void 0 : _24.values : undefined;
        const unitsExtendable = ((_25 = this.pageItem) === null || _25 === void 0 ? void 0 : _25.units)
            .isExtendable;
        const currentSection = (_27 = (_26 = this.pageItem) === null || _26 === void 0 ? void 0 : _26.section) !== null && _27 !== void 0 ? _27 : {
            en: "None",
            fr: "Aucune",
        };
        const hasComment = !!((_28 = this.pageItem) === null || _28 === void 0 ? void 0 : _28.comment);
        const comment = (_29 = this.pageItem) === null || _29 === void 0 ? void 0 : _29.comment;
        return DomainCollection(...this.partInstances(this.wordingPart, wording), ...this.partInstances(this.typePart, typeName), ...this.partInstances(this.argDatePart, dateFormat), ...this.partInstances(this.argDurationTimePart, timeFormat), ...this.partInstances(this.argMinScalePart, scaleMin), ...this.partInstances(this.argMaxScalePart, scaleMax), ...this.partInstances(this.argScorePart, scores), ...this.partInstances(this.argMultiplicityChoicePart, choiceMultiplicity), ...this.partInstances(this.argChoicesPart, choices), new InterviewItem(this.contextPart, hasContext), new InterviewItem(this.requiredRulePart, isRequired), new InterviewItem(this.letterCaseRulePart, letterCase), new InterviewItem(this.letterCaseRuleArgPart, letterCaseName), new InterviewItem(this.inRangePart, !!((_30 = this.metadata) === null || _30 === void 0 ? void 0 : _30.range)), new InterviewItem(this.inRangeMinArgPart, isInRange), new InterviewItem(this.inRangeMaxArgPart, inRangeMax), new InterviewItem(this.inRangeLimitsArgPart, limits), new InterviewItem(this.textLengthPart, hasTextLength), new InterviewItem(this.textLengthArgPart, textLengthBehaviour), new InterviewItem(this.textLengthArgPrecisionPart, textLength), new InterviewItem(this.decimalPart, hasPrecision), new InterviewItem(this.decimalArgPart, precision), new InterviewItem(this.isComputedPart, isComputed), new InterviewItem(this.computedFormulaPart, formula), new InterviewItem(this.hasDefaultPart, hasDefault), new InterviewItem(this.defaultTypePart, defaultType), new InterviewItem(this.defaultPart, defaultValue), new InterviewItem(this.isActivablePart, isActivable), new InterviewItem(this.activationConditionTypePart, activableBehaviour), new InterviewItem(this.activationConditionArgPart, activableCondition), new InterviewItem(this.isCriticalPart, isCritical), new InterviewItem(this.criticalEventPart, criticalEvent), new InterviewItem(this.criticalMessagePart, criticalMessage), new InterviewItem(this.criticalTriggerPart, criticalTrigger), new InterviewItem(this.isPinnedPart, isPinned), new InterviewItem(this.pinTitlePart, pinTitle), new InterviewItem(this.isKpiPart, isKpi), new InterviewItem(this.kpiTitlePart, kpiTitle), new InterviewItem(this.unitPart, hasUnits), new InterviewItem(this.argUnitPart, units), new InterviewItem(this.extendableUnitPart, unitsExtendable), new InterviewItem(this.applyPart, undefined), new InterviewItem(this.commentPart, hasComment), new InterviewItem(this.argCommentPart, comment), new InterviewItem(this.sectionCurrentPart, currentSection), new InterviewItem(this.sectionAckChangePart, undefined), new InterviewItem(this.sectionArgPart, undefined), new InterviewItem(this.sectionNamePart, undefined));
    }
    coerceContext(typeName, wording) {
        while (typeName.length < wording.length) {
            typeName.push(...typeName.slice(0, wording.length - typeName.length));
        }
        while (wording.length < typeName.length) {
            wording.push(...wording.slice(0, typeName.length - wording.length));
        }
    }
    getWording() {
        var _a;
        const wording = (_a = this.pageItem) === null || _a === void 0 ? void 0 : _a.wording;
        return Array.isArray(wording) ? wording : [wording];
    }
    getTypeProps(f) {
        var _a;
        const m = typeof f == "string" ? (t) => t[f] : f;
        const type = (_a = this.pageItem) === null || _a === void 0 ? void 0 : _a.type;
        if (type.name == "context")
            return Array.from(Object.values(type)
                .filter(v => v != "context")
                .map(t => m(t)));
        return [m(type)];
    }
    partInstances(part, values) {
        const instances = [];
        let p;
        for (const value of values) {
            p = p ? p.nextInstance() : part;
            instances.push(new InterviewItem(p, value));
        }
        return instances;
    }
    apply(survey, participant, interviewItems) {
        const { updatedItem, updatedRules } = this.bindPartItems(survey.value, interviewItems);
        survey.updateItem(this.pageIndex, this.pageItemIndex, updatedItem, updatedRules);
        participant.updatePageSets(survey.pageSets);
        participant.updateItem(updatedItem);
    }
    bindPartItems(survey, interviewItems) {
        const { pageItemBuilder, surveyBuilder } = this.getBuilders(interviewItems, survey);
        this.bindPinsAndKpis(interviewItems, pageItemBuilder);
        this.bindUnits(interviewItems, pageItemBuilder);
        this.bindComments(interviewItems, pageItemBuilder);
        this.bindRules(interviewItems, pageItemBuilder);
        const updatedItem = pageItemBuilder.build([...survey.items]);
        const updatedRules = surveyBuilder.crossRules.map(b => b.build([updatedItem, ...survey.items]));
        return { updatedItem, updatedRules };
    }
    getBuilders(interviewItems, survey) {
        const { wording, variableName, type } = this.bindItem(interviewItems);
        const section = this.bindSection(interviewItems);
        const surveyBuilder = new SurveyBuilder();
        surveyBuilder.options(survey.options);
        const pageItemBuilder = surveyBuilder.question(wording, variableName, type, section);
        return { pageItemBuilder, surveyBuilder };
    }
    bindItem(interviewItems) {
        var _a, _b;
        const variableName = (_a = this.pageItem) === null || _a === void 0 ? void 0 : _a.variableName;
        const wording = this.bindWording(interviewItems);
        const type = this.bindType(interviewItems);
        const hasContext = !!((_b = interviewItems.find(i => i.pageItem == this.contextPart)) === null || _b === void 0 ? void 0 : _b.value);
        if (hasContext && !this.hasContext) {
            return {
                wording: [wording],
                variableName,
                type: ItemTypes.context([type]),
            };
        }
        if (!hasContext && this.hasContext) {
            return {
                wording: Array.isArray(wording) ? wording[0] : wording,
                variableName,
                type: type instanceof ContextType ? type[0] : type,
            };
        }
        return { wording, variableName, type };
    }
    bindWording(interviewItems) {
        const wordings = interviewItems
            .filter(i => i.pageItem.isInstanceOf(this.wordingPart))
            .sort((a, b) => a.pageItem.instance - b.pageItem.instance)
            .map(i => i.value);
        return wordings.length == 1 ? wordings[0] : wordings;
    }
    bindSection(interviewItems) {
        var _a, _b, _c, _d;
        const newSectionName = (_a = interviewItems.find(i => i.pageItem == this.sectionNamePart)) === null || _a === void 0 ? void 0 : _a.value;
        const sectionChangeAck = (_b = interviewItems.find(i => i.pageItem == this.sectionAckChangePart)) === null || _b === void 0 ? void 0 : _b.value;
        const sectionArg = (_c = interviewItems.find(i => i.pageItem == this.sectionArgPart)) === null || _c === void 0 ? void 0 : _c.value;
        const section = sectionChangeAck
            ? sectionArg == "NONE"
                ? undefined
                : newSectionName
            : (_d = this.pageItem) === null || _d === void 0 ? void 0 : _d.section;
        return section;
    }
    bindPinsAndKpis(interviewItems, pageItemBuilder) {
        var _a, _b, _c, _d, _e, _f;
        const isPinnedItem = (_a = interviewItems.find(i => i.pageItem == this.isPinnedPart)) === null || _a === void 0 ? void 0 : _a.value;
        if (isPinnedItem) {
            const pinTitle = (_b = interviewItems.find(i => i.pageItem == this.pinTitlePart)) === null || _b === void 0 ? void 0 : _b.value;
            pageItemBuilder.pin(pinTitle);
        }
        const isKpiedItem = (_c = interviewItems.find(i => i.pageItem == this.isKpiPart)) === null || _c === void 0 ? void 0 : _c.value;
        if (isKpiedItem) {
            const kpiTitle = (_d = interviewItems.find(i => i.pageItem == this.kpiTitlePart)) === null || _d === void 0 ? void 0 : _d.value;
            const kpiPivot = hasPivot((_e = this.pageItem) === null || _e === void 0 ? void 0 : _e.kpi)
                ? (_f = this.pageItem) === null || _f === void 0 ? void 0 : _f.kpi.pivot.variableName
                : undefined;
            pageItemBuilder.kpi(kpiTitle, kpiPivot);
        }
    }
    bindUnits(interviewItems, pageItemBuilder) {
        var _a, _b, _c;
        const units = (_a = interviewItems.find(i => i.pageItem == this.unitPart)) === null || _a === void 0 ? void 0 : _a.value;
        if (units) {
            const unitList = (_b = interviewItems.find(i => i.pageItem == this.argUnitPart)) === null || _b === void 0 ? void 0 : _b.value;
            pageItemBuilder.unit(...unitList);
            const unitExtendable = (_c = interviewItems.find(i => i.pageItem == this.extendableUnitPart)) === null || _c === void 0 ? void 0 : _c.value;
            if (unitExtendable)
                pageItemBuilder.extendable();
        }
    }
    bindComments(interviewItems, pageItemBuilder) {
        var _a, _b;
        const comment = (_a = interviewItems.find(i => i.pageItem == this.commentPart)) === null || _a === void 0 ? void 0 : _a.value;
        if (comment) {
            const commentString = (_b = interviewItems.find(i => i.pageItem == this.argCommentPart)) === null || _b === void 0 ? void 0 : _b.value;
            pageItemBuilder.comment(commentString);
        }
    }
    getLimits() {
        var _a;
        const value = [];
        const limits = (_a = this.metadata) === null || _a === void 0 ? void 0 : _a.limits;
        if (limits === null || limits === void 0 ? void 0 : limits.includeLower)
            value.push("L");
        if (limits === null || limits === void 0 ? void 0 : limits.includeUpper)
            value.push("U");
        return value;
    }
    bindRules(interviewItems, pageItemBuilder) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
        const required = (_a = interviewItems.find(i => i.pageItem == this.requiredRulePart)) === null || _a === void 0 ? void 0 : _a.value;
        if (required)
            pageItemBuilder.required();
        const letterCased = ((_b = interviewItems.find(i => i.pageItem == this.letterCaseRulePart)) === null || _b === void 0 ? void 0 : _b.value)
            ? ((_c = interviewItems.find(i => i.pageItem == this.letterCaseRuleArgPart)) === null || _c === void 0 ? void 0 : _c.value) == "L"
                ? "lower"
                : ((_d = interviewItems.find(i => i.pageItem == this.letterCaseRuleArgPart)) === null || _d === void 0 ? void 0 : _d.value) == "U"
                    ? "upper"
                    : undefined
            : undefined;
        if (letterCased)
            pageItemBuilder.letterCase(letterCased);
        const inRange = (_e = interviewItems.find(i => i.pageItem == this.inRangePart)) === null || _e === void 0 ? void 0 : _e.value;
        const inRangeMin = parseRangeValue((_f = interviewItems.find(i => i.pageItem == this.inRangeMinArgPart)) === null || _f === void 0 ? void 0 : _f.value);
        const inRangeMax = parseRangeValue((_g = interviewItems.find(i => i.pageItem == this.inRangeMaxArgPart)) === null || _g === void 0 ? void 0 : _g.value);
        const limitPart = (_h = interviewItems.find(i => i.pageItem == this.inRangeLimitsArgPart)) === null || _h === void 0 ? void 0 : _h.value;
        const inRangeLimits = {
            includeLower: limitPart === null || limitPart === void 0 ? void 0 : limitPart.includes("L"),
            includeUpper: limitPart === null || limitPart === void 0 ? void 0 : limitPart.includes("U"),
        };
        if (inRange)
            pageItemBuilder.inRange(inRangeMin, inRangeMax, inRangeLimits);
        const textlength = (_j = interviewItems.find(i => i.pageItem == this.textLengthPart)) === null || _j === void 0 ? void 0 : _j.value;
        const textlengthArg = (_k = interviewItems.find(i => i.pageItem == this.textLengthArgPart)) === null || _k === void 0 ? void 0 : _k.value;
        const textlengthArgPrecision = (_l = interviewItems.find(i => i.pageItem == this.textLengthArgPrecisionPart)) === null || _l === void 0 ? void 0 : _l.value;
        if (textlength)
            textlengthArg == "FL"
                ? pageItemBuilder.fixedLength(textlengthArgPrecision)
                : pageItemBuilder.maxLength(textlengthArgPrecision);
        const decimal = (_m = interviewItems.find(i => i.pageItem == this.decimalPart)) === null || _m === void 0 ? void 0 : _m.value;
        const decimalArg = (_o = interviewItems.find(i => i.pageItem == this.decimalArgPart)) === null || _o === void 0 ? void 0 : _o.value;
        if (decimal)
            pageItemBuilder.decimalPrecision(decimalArg);
        const isComputed = (_p = interviewItems.find(i => i.pageItem == this.isComputedPart)) === null || _p === void 0 ? void 0 : _p.value;
        if (isComputed) {
            const computedFormula = (_q = interviewItems.find(i => i.pageItem == this.computedFormulaPart)) === null || _q === void 0 ? void 0 : _q.value;
            pageItemBuilder.computed(computedFormula);
        }
        const hasDefault = interviewItems.some(i => i.pageItem == this.hasDefaultPart && i.value);
        if (hasDefault) {
            const defaultType = (_r = interviewItems.find(i => i.pageItem == this.defaultTypePart)) === null || _r === void 0 ? void 0 : _r.value;
            const defaultValue = (_s = interviewItems.find(i => i.pageItem == this.defaultPart)) === null || _s === void 0 ? void 0 : _s.value;
            switch (defaultType) {
                case "constant":
                    pageItemBuilder.defaultValue(defaultValue);
                    break;
                case "computed":
                    pageItemBuilder.defaultValue({ formula: defaultValue });
                    break;
                case "copy":
                    pageItemBuilder.defaultValue({ source: defaultValue });
                    break;
            }
        }
        const activationRule = (_t = interviewItems.find(i => i.pageItem == this.isActivablePart)) === null || _t === void 0 ? void 0 : _t.value;
        const activationRuleType = (_u = interviewItems.find(i => i.pageItem == this.activationConditionTypePart)) === null || _u === void 0 ? void 0 : _u.value;
        const activationRuleCondition = (_v = interviewItems.find(i => i.pageItem == this.activationConditionArgPart)) === null || _v === void 0 ? void 0 : _v.value;
        if (activationRule) {
            activationRuleType == "A"
                ? pageItemBuilder.activateWhen(activationRuleCondition)
                : pageItemBuilder.visibleWhen(activationRuleCondition);
        }
        const criticalRule = (_w = interviewItems.find(i => i.pageItem == this.isCriticalPart)) === null || _w === void 0 ? void 0 : _w.value;
        const criticalRuleEvent = (_x = interviewItems.find(i => i.pageItem == this.criticalEventPart)) === null || _x === void 0 ? void 0 : _x.value;
        const criticalRuleTrigger = (_y = interviewItems.find(i => i.pageItem == this.criticalTriggerPart)) === null || _y === void 0 ? void 0 : _y.value;
        const criticalRuleMessage = (_z = interviewItems.find(i => i.pageItem == this.criticalMessagePart)) === null || _z === void 0 ? void 0 : _z.value;
        if (criticalRule) {
            if (criticalRuleTrigger !== "" && criticalRuleTrigger !== undefined)
                pageItemBuilder.critical(criticalRuleEvent, criticalRuleMessage, {
                    formula: criticalRuleTrigger,
                });
            else
                pageItemBuilder.critical(criticalRuleEvent, criticalRuleMessage);
        }
    }
    bindType(interviewItems) {
        var _a;
        const typeNames = (_a = interviewItems
            .filter(i => i.pageItem.isInstanceOf(this.typePart))) === null || _a === void 0 ? void 0 : _a.map(i => [i.value, i.pageItem.instance]);
        if (typeNames.length == 1)
            return this.bindTypeInstance(interviewItems, typeNames[0][0]);
        const types = typeNames
            .sort(([, i], [, j]) => i - j)
            .map(n => this.bindTypeInstance(interviewItems, ...n));
        return ItemTypes.context(types);
    }
    bindTypeInstance(interviewItems, typeName, instance = 1) {
        var _a, _b, _c, _d, _e, _f, _g;
        const args = {};
        switch (typeName) {
            case "date":
                args.incomplete = (_a = interviewItems.find(i => i.pageItem.isInstanceOf(this.argDatePart, instance))) === null || _a === void 0 ? void 0 : _a.value;
                break;
            case "scale":
                args.min = (_b = interviewItems.find(i => i.pageItem.isInstanceOf(this.argMinScalePart, instance))) === null || _b === void 0 ? void 0 : _b.value;
                args.max = (_c = interviewItems.find(i => i.pageItem.isInstanceOf(this.argMaxScalePart, instance))) === null || _c === void 0 ? void 0 : _c.value;
                break;
            case "score": {
                const scores = (_d = interviewItems.find(i => i.pageItem.isInstanceOf(this.argScorePart, instance))) === null || _d === void 0 ? void 0 : _d.value;
                args.scores = scores.map(s => s.score);
                args.labels = scores.map(s => s.label);
                break;
            }
            case "choice": {
                const choices = (_e = interviewItems.find(i => i.pageItem.isInstanceOf(this.argChoicesPart, instance))) === null || _e === void 0 ? void 0 : _e.value;
                args.multiplicity =
                    ((_f = interviewItems.find(i => i.pageItem.isInstanceOf(this.argMultiplicityChoicePart, instance))) === null || _f === void 0 ? void 0 : _f.value) == true
                        ? "many"
                        : "one";
                args.choices = choices === null || choices === void 0 ? void 0 : choices.map(c => c.name);
                args.labels = choices === null || choices === void 0 ? void 0 : choices.map(c => c.label);
                break;
            }
            case "time":
                args.duration = !!((_g = interviewItems.find(i => i.pageItem.isInstanceOf(this.argDurationTimePart, instance))) === null || _g === void 0 ? void 0 : _g.value);
                break;
        }
        return ItemTypes.create(Object.assign({ name: typeName }, args));
    }
    canApply(survey, interviewItems) {
        var _a;
        const allParts = [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items];
        return allRequiredSet(allParts, interviewItems);
    }
}
function parseRangeValue(rangeValue) {
    const num = Number(rangeValue);
    if (!isNaN(num))
        return num;
    const date = new Date(rangeValue);
    if (!isNaN(date.getTime()))
        return date;
    return { formula: rangeValue };
}

function mlChoices(b, multiplicity, names, options) {
    var _a, _b;
    let pageChoices = b.types.glossary(multiplicity, ...names.map(name => { var _a; return getTranslation(name, "__code__", (_a = options.defaultLang) !== null && _a !== void 0 ? _a : "en"); }));
    for (const lang of (_a = options.languages) !== null && _a !== void 0 ? _a : [(_b = options.defaultLang) !== null && _b !== void 0 ? _b : "en"])
        pageChoices = pageChoices.translate(lang, ...names.map(name => getTranslation(name, lang)));
    return pageChoices;
}

function libIncludePage(b, name, survey, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
    builder
        .question("", "__INCLUDE__", b.types.yesno)
        .translate("en", "Include an existing page?")
        .translate("fr", "Inclure une page existante ?")
        .defaultValue(0)
        .comment("{.studioPage}");
    const pageChoices = mlChoices(b, "one", survey.pages.map(p => p.name), survey.options);
    builder
        .question("", "__INCLUDE_PAGE__", pageChoices)
        .translate("en", "Page:")
        .translate("fr", "Page :")
        .required()
        .visibleWhen("__INCLUDE__")
        .comment("{.studioPage.pad}");
    for (const page of survey.pages)
        buildQuestionSelector(b, builder, page);
    builder
        .question("", "__INCLUDE_CONTEXT__", b.types.integer)
        .translate("en", "Context:")
        .translate("fr", "Contexte :")
        .visibleWhen("__INCLUDE__")
        .inRange(1, 9)
        .comment("{.studioPage.pad}");
    return builder.endSection();
}
function buildQuestionSelector(b, builder, page) {
    const code = getTranslation(page.name, "__code__");
    const variableName = `__INCLUDE_SELECT_${code}__`;
    const itemChoices = b.types.glossary("many", ...page.items.map(i => getItem(i).variableName));
    builder
        .question("", variableName, itemChoices)
        .translate("en", "Variables:")
        .translate("fr", "Variables :")
        .visibleWhen(`__INCLUDE__ && __INCLUDE_PAGE__=='${code}'`)
        .comment("{.studioPage.pad}");
}

class IncludePageCommand {
    buildParts(survey, section) {
        const builder = new SurveyBuilder();
        libIncludePage(builder, "includePage", survey, section);
        this.parts = builder.get();
    }
    get includePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__INCLUDE__");
    }
    get pageCodePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__INCLUDE_PAGE__");
    }
    get selectorParts() {
        return this.parts.items
            .filter(i => i.variableName.startsWith("__INCLUDE_SELECT_"))
            .reduce((parts, i) => {
            const code = i.variableName.slice(17, -2);
            return Object.assign(Object.assign({}, parts), { [code]: i });
        }, {});
    }
    get contextPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__INCLUDE_CONTEXT__");
    }
    start(survey, participant, pageIndex, section) {
        var _a, _b;
        this.pageIndex = pageIndex;
        this.buildParts(survey, section);
        this.library = survey.pages[pageIndex].includes.find((i) => i instanceof Library);
        survey.insertItems(pageIndex, 1, [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.crossRules]);
        participant.updatePageSets(survey.pageSets);
        participant.insertItems(this.getPartItems());
    }
    getPartItems() {
        var _a, _b;
        const include = !!this.library;
        const pageCode = getTranslation((_a = this.library) === null || _a === void 0 ? void 0 : _a.page.name, "__code__");
        const context = ((_b = this.library) === null || _b === void 0 ? void 0 : _b.contexts)
            ? this.library.contexts[0].context + 1
            : undefined;
        return DomainCollection(new InterviewItem(this.includePart, include), new InterviewItem(this.pageCodePart, pageCode), ...this.selectorItems(this.selectorParts, pageCode), new InterviewItem(this.contextPart, context));
    }
    selectorItems(selectorParts, pageCode) {
        const getValue = (code) => {
            var _a;
            if (code != pageCode)
                return undefined;
            const lib = this.library;
            const pageItems = typeof lib.pageItems == "undefined"
                ? lib.page.items.map(i => getItem(i).variableName)
                : (_a = lib.pageItems) === null || _a === void 0 ? void 0 : _a.map(i => i.variableName);
            return [...pageItems];
        };
        return Object.entries(selectorParts).map(([code, p]) => new InterviewItem(p, getValue(code)));
    }
    apply(survey, participant, interviewItems) {
        var _a, _b;
        const include = !!((_a = interviewItems.find(i => i.pageItem == this.includePart)) === null || _a === void 0 ? void 0 : _a.value);
        if (include) {
            const { includedLibrary } = this.bindPartItems(survey, interviewItems);
            const pageIndex = this.pageIndex;
            if (typeof this.library == "undefined")
                survey.insertInclude(pageIndex, survey.pages[pageIndex].includes.length, includedLibrary);
            else
                survey.updateInclude(pageIndex, survey.pages[pageIndex].includes.indexOf(this.library), includedLibrary);
            const itemsWithContext = (_b = includedLibrary.contexts) === null || _b === void 0 ? void 0 : _b.map(({ pageItem, context }) => new InterviewItem(pageItem, undefined, { context }));
            participant.updatePageSets(survey.pageSets);
            participant.insertItems(itemsWithContext);
        }
    }
    bindPartItems(survey, interviewItems) {
        var _a, _b, _c;
        const pageCode = (_a = interviewItems.find(i => i.pageItem == this.pageCodePart)) === null || _a === void 0 ? void 0 : _a.value;
        const variableNames = (_b = interviewItems.find(i => i.pageItem == this.selectorParts[pageCode])) === null || _b === void 0 ? void 0 : _b.value;
        const context = (_c = interviewItems.find(i => i.pageItem == this.contextPart)) === null || _c === void 0 ? void 0 : _c.value;
        const page = survey.pages.find(p => getTranslation(p.name, "__code__") == pageCode);
        const allPageItems = page.items.map(i => getItem(i));
        const pageItems = variableNames
            ? allPageItems.filter(i => variableNames.includes(i.variableName))
            : allPageItems;
        const contexts = context
            ? pageItems.map(i => ({ pageItem: i, context: context - 1 }))
            : undefined;
        const includedLibrary = new Library(page, pageItems, contexts);
        return { includedLibrary };
    }
    canApply(survey, interviewItems) {
        var _a;
        const allParts = [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items];
        return allRequiredSet(allParts, interviewItems);
    }
}

function libUpdatePage(b, name, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
    builder
        .question("", "__PAGE_NAME__", b.types.text)
        .translate("en", "Page name :")
        .translate("fr", "Intitulé de la page :")
        .required()
        .comment("{.studioPage.multiLang}");
    if (section)
        builder.endSection();
    return builder;
}

class UpdatePageCommand {
    constructor() {
        this.includeCommand = new IncludePageCommand();
    }
    buildParts(survey, section) {
        const builder = new SurveyBuilder();
        libUpdatePage(builder, "updatePage", section);
        libApply(builder, "apply", section);
        this.parts = builder.get();
    }
    get itemParts() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items;
    }
    get namePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__PAGE_NAME__");
    }
    start(survey, participant, index, section = { en: "Update Page", fr: "Mise à jour de la page" }) {
        var _a, _b;
        this.pageIndex = index;
        this.page = survey.value.pages[index];
        this.defaultLang = survey.options.defaultLang;
        this.buildParts(survey, section);
        survey.insertItems(this.pageIndex, 0, [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.crossRules]);
        this.includeCommand.start(survey, participant, this.pageIndex, section);
        participant.updatePageSets(survey.pageSets);
        participant.insertItems(this.getPartItems());
    }
    getPartItems() {
        var _a;
        const name = (_a = this.page) === null || _a === void 0 ? void 0 : _a.name;
        return DomainCollection(new InterviewItem(this.namePart, name));
    }
    apply(survey, participant, interviewItems) {
        const { updatedPage } = this.bindPartItems(survey.value, interviewItems);
        survey.updatePage(this.pageIndex, updatedPage);
        this.applyInclude(survey, participant, interviewItems);
        participant.updatePageSets(survey.pageSets);
    }
    applyInclude(survey, participant, interviewItems) {
        this.includeCommand.apply(survey, participant, interviewItems);
    }
    bindPartItems(survey, interviewItems) {
        var _a, _b;
        const surveyBuilder = new SurveyBuilder();
        surveyBuilder.options(survey.options);
        const code = getTranslation((_a = this.page) === null || _a === void 0 ? void 0 : _a.name, "__code__", survey.options.defaultLang);
        const pageBuilder = surveyBuilder.page(code);
        const names = (_b = interviewItems.find(i => i.pageItem == this.namePart)) === null || _b === void 0 ? void 0 : _b.value;
        if (names && typeof names != "string") {
            const langs = Object.entries(names);
            langs.forEach(([lang, name]) => pageBuilder.translate(lang, name));
        }
        else {
            const defaultLang = survey.options.defaultLang;
            pageBuilder.translate(defaultLang, names);
        }
        const newPage = pageBuilder.build([]);
        const updatedPage = this.page.update({
            name: newPage.name,
        });
        return { updatedPage };
    }
    canApply(survey, interviewItems) {
        var _a;
        const allParts = [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items];
        return allRequiredSet(allParts, interviewItems);
    }
}

function libUpdatePageSet(b, name, survey, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
    const pageChoices = mlChoices(b, "many", survey.pages
        .filter(p => { var _a; return !((_a = survey.mainWorkflow.info) === null || _a === void 0 ? void 0 : _a.pages.includes(p)); })
        .map(p => p.name), survey.options);
    builder
        .question("", "__PAGE_SET_NAME__", b.types.text)
        .translate("en", "Name :")
        .translate("fr", "Intitulé :")
        .required()
        .comment("{.studioPageSet.multiLang}")
        .question("", "__PAGE_SET_DATEVAR__", b.types.text)
        .translate("en", "Date variable :")
        .translate("fr", "Variable de date :")
        .letterCase("upper")
        .comment("{.studioPageSet}")
        .question("", "__PAGE_SET_PAGES__", pageChoices)
        .translate("en", "Pages : ")
        .translate("fr", "Pages : ")
        .comment("{.studioPageSet.studioPageSelector}");
    if (section)
        builder.endSection();
    return builder;
}

class UpdatePageSetCommand {
    buildParts(survey, section = {
        en: "Update Visit",
        fr: "Mise à jour de la visite",
    }) {
        const builder = new SurveyBuilder();
        libUpdatePageSet(builder, "updatePageSet", survey, section);
        libApply(builder, "apply", section);
        this.parts = builder.get();
    }
    get itemParts() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items;
    }
    get applyPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__APPLY__");
    }
    get typePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__PAGE_SET_NAME__");
    }
    get dateVarPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__PAGE_SET_DATEVAR__");
    }
    get pagesPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__PAGE_SET_PAGES__");
    }
    start(survey, participant, pageSetIndex, section) {
        var _a, _b;
        this.pageSetIndex = pageSetIndex;
        this.pageIndex = 0;
        this.pageSet = survey.value.pageSets[this.pageSetIndex];
        this.defaultLang = survey.options.defaultLang;
        this.buildParts(survey, section);
        this.page = this.buildParameterPage(survey);
        survey.insertPage(pageSetIndex, 0, this.page);
        this.surveyPageIndex = survey.pages.indexOf(this.page);
        survey.insertItems(this.surveyPageIndex, 0, [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.crossRules]);
        participant.updatePageSets(survey.pageSets);
        participant.insertItems(this.getPartItems());
    }
    buildParameterPage(survey) {
        const b = new SurveyBuilder();
        b.options(survey.options);
        const pagebuilder = b
            .page("Visit Parameters")
            .translate("fr", "Paramètres de la visite");
        return pagebuilder.build([]);
    }
    getPartItems() {
        var _a, _b, _c;
        const typeName = (_a = this.pageSet) === null || _a === void 0 ? void 0 : _a.type;
        const dateVar = (_b = this.pageSet) === null || _b === void 0 ? void 0 : _b.datevar;
        const pages = (_c = this.pageSet) === null || _c === void 0 ? void 0 : _c.pages.map(p => {
            var _a, _b;
            return {
                name: getTranslation(p.name, "__code__", this.defaultLang),
                mandatory: (_b = (_a = this.pageSet) === null || _a === void 0 ? void 0 : _a.mandatoryPages) === null || _b === void 0 ? void 0 : _b.includes(p),
            };
        });
        return DomainCollection(new InterviewItem(this.typePart, typeName), new InterviewItem(this.dateVarPart, dateVar), new InterviewItem(this.pagesPart, pages));
    }
    apply(survey, participant, interviewItems) {
        const { updatedPageSet } = this.bindPartItems(survey, interviewItems);
        survey.updatePageSet(this.pageSetIndex, updatedPageSet);
        participant.updatePageSet(updatedPageSet);
        this.pageIndex = -1;
    }
    bindPartItems(survey, interviewItems) {
        var _a, _b;
        const pageSetBuilder = this.getBuilder(survey);
        this.bindTypeNames(interviewItems, pageSetBuilder, survey);
        const dateVariable = (_a = interviewItems.find(i => i.pageItem == this.dateVarPart)) === null || _a === void 0 ? void 0 : _a.value;
        if (dateVariable)
            pageSetBuilder.datevariable(dateVariable);
        const pages = (_b = interviewItems.find(i => i.pageItem == this.pagesPart)) === null || _b === void 0 ? void 0 : _b.value;
        if (pages)
            pageSetBuilder.pages(...pages);
        const updatedPageSet = pageSetBuilder.build([...survey.pages]);
        return { updatedPageSet };
    }
    getBuilder(survey) {
        var _a;
        const code = getTranslation((_a = this.pageSet) === null || _a === void 0 ? void 0 : _a.type, "__code__", survey.options.defaultLang);
        const surveyBuilder = new SurveyBuilder();
        surveyBuilder.options(survey.options);
        const pageSetBuilder = surveyBuilder.pageSet(code);
        return pageSetBuilder;
    }
    bindTypeNames(interviewItems, pageSetBuilder, survey) {
        var _a;
        const types = (_a = interviewItems.find(i => i.pageItem == this.typePart)) === null || _a === void 0 ? void 0 : _a.value;
        if (types && typeof types != "string") {
            const langs = Object.entries(types);
            langs.forEach(([lang, type]) => pageSetBuilder.translate(lang, type));
        }
        else {
            const defaultLang = survey.options.defaultLang;
            pageSetBuilder.translate(defaultLang, types);
        }
    }
    canApply(survey, interviewItems) {
        var _a;
        const allParts = [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items];
        return allRequiredSet(allParts, interviewItems);
    }
}

function libUpdateMainWorkflow(b, name, survey, section) {
    const builder = b.page(name);
    const pageSetChoices = mainWorkflowPageSetChoices(b, survey);
    if (section)
        builder.startSection(section);
    builder
        .question("", "__WORKFLOW_INITIAL__", pageSetChoices)
        .translate("en", "Initial visits : ")
        .translate("fr", "Visites initiales : ")
        .comment("{.studioWorkflow.studioPageSetSelector}")
        .question("", "__WORKFLOW_FOLLOWUP__", pageSetChoices)
        .translate("en", "Follow up visits : ")
        .translate("fr", "Visites de suivi : ")
        .comment("{.studioWorkflow.studioPageSetSelector}")
        .question("", "__WORKFLOW_AUXILIARY__", pageSetChoices)
        .translate("en", "Auxiliary visits/exams : ")
        .translate("fr", "Visites/Examens auxiliaires : ")
        .comment("{.studioWorkflow.studioPageSetSelector}")
        .question("", "__WORKFLOW_END__", pageSetChoices)
        .translate("en", "Ending visit : ")
        .translate("fr", "Visite de fin : ")
        .comment("{.studioWorkflow.studioPageSetSelector}")
        .question("", "__WORKFLOW_PROCESS__", b.types.choice("one", "input", "input // signature", "input => signature", "input // signature // query // checking", "input // query // checking", "input // query // checking => signature", "input // signature => input // query // checking", "input => signature => input // query // checking"))
        .translate("en", "Processes: ")
        .translate("fr", "Process : ")
        .comment("{.studioWorkflow.column}");
    if (section)
        builder.endSection();
    return builder;
}
function mainWorkflowPageSetChoices(b, survey) {
    return mlChoices(b, "many", survey.pageSets.filter(p => p != survey.mainWorkflow.info).map(p => p.type), survey.options);
}

function libUpdateDerivedWorkflow(b, name, survey, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
    const pageSetChoices = derivedWorkflowPageSetChoices(b, survey);
    const notificationChoices = b.types.choice("many", ...survey.items
        .map(i => new Metadata(i, survey.rules).critical)
        .filter(c => !!c)
        .sort()
        .filter((ev, x, arr) => x == 0 || arr[x - 1] != ev));
    builder
        .question("", "__WORKFLOW_WITH_PAGESETS__", pageSetChoices)
        .translate("en", "Visits included:")
        .translate("fr", "Visites inclues : ")
        .comment("{.studioWorkflow.studioPageSetSelector.no-ordering}")
        .question("", "__WORKFLOW_NOTIFICATIONS__", notificationChoices)
        .translate("en", "Notifications:")
        .translate("fr", "Notifications : ")
        .comment("{.studioWorkflow}");
    if (section)
        builder.endSection();
    return builder;
}
function derivedWorkflowPageSetChoices(b, survey) {
    return mlChoices(b, "many", survey.pageSets.map(p => p.type), survey.options);
}

class UpdateWorkflowCommand {
    get applyPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__APPLY__");
    }
    get initialPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__WORKFLOW_INITIAL__");
    }
    get followupPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__WORKFLOW_FOLLOWUP__");
    }
    get auxiliaryPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__WORKFLOW_AUXILIARY__");
    }
    get endPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__WORKFLOW_END__");
    }
    get withpagesetsPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__WORKFLOW_WITH_PAGESETS__");
    }
    get notificationsPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__WORKFLOW_NOTIFICATIONS__");
    }
    get isMain() {
        return this.mainWorkflow === this.workflow;
    }
    buildParts(survey, section) {
        const builder = new SurveyBuilder();
        this.isMain
            ? libUpdateMainWorkflow(builder, "updateWorkflow", survey, section)
            : libUpdateDerivedWorkflow(builder, "updateWorkflow", survey, section);
        libApply(builder, "apply", section);
        this.parts = builder.get();
    }
    start(survey, participant, workflowIndex, pageSetIndex, section) {
        var _a, _b;
        this.pageSetIndex = pageSetIndex;
        this.pageIndex = 0;
        this.workflowIndex = workflowIndex;
        this.workflow = survey.value.workflows[this.workflowIndex];
        this.mainWorkflow = survey.mainWorkflow;
        this.defaultLang = survey.options.defaultLang;
        this.buildParts(survey, section !== null && section !== void 0 ? section : {
            en: `Update Workflow ${this.workflow.name}`,
            fr: `Mise à jour du workflow ${this.workflow.name}`,
        });
        this.page = this.buildSettingsPage(survey);
        survey.insertPage(pageSetIndex, 0, this.page);
        this.surveyPageIndex = survey.pages.indexOf(this.page);
        survey.insertItems(this.surveyPageIndex, 0, [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.crossRules]);
        participant.updatePageSets(survey.pageSets);
        participant.insertItems(this.getPartItems());
    }
    buildSettingsPage(survey) {
        const b = new SurveyBuilder();
        b.options(survey.options);
        const pageBuilder = b
            .page("Workflow parameters")
            .translate("fr", "Paramètres du workflow");
        return pageBuilder.build([]);
    }
    getPartItems() {
        var _a, _b, _c, _d, _e;
        const initial = (_a = this.workflow) === null || _a === void 0 ? void 0 : _a.single.filter(ps => { var _a; return (_a = this.workflow) === null || _a === void 0 ? void 0 : _a.sequence.includes(ps); }).map(ps => getTranslation(ps.type, "__code__", this.defaultLang));
        const followup = (_b = this.workflow) === null || _b === void 0 ? void 0 : _b.many.filter(ps => { var _a; return (_a = this.workflow) === null || _a === void 0 ? void 0 : _a.sequence.includes(ps); }).map(ps => getTranslation(ps.type, "__code__", this.defaultLang));
        const auxiliary = (_c = this.workflow) === null || _c === void 0 ? void 0 : _c.many.filter(ps => { var _a; return !((_a = this.workflow) === null || _a === void 0 ? void 0 : _a.sequence.includes(ps)); }).map(ps => getTranslation(ps.type, "__code__", this.defaultLang));
        const withPageSets = (_d = this.workflow) === null || _d === void 0 ? void 0 : _d.pageSets.map(ps => getTranslation(ps.type, "__code__", this.defaultLang));
        const notifications = this.workflow ? [...this.workflow.notifications] : [];
        const end = (_e = this.workflow) === null || _e === void 0 ? void 0 : _e.stop.map(ps => getTranslation(ps.type, "__code__", this.defaultLang));
        return this.isMain
            ? DomainCollection(new InterviewItem(this.initialPart, initial), new InterviewItem(this.followupPart, followup), new InterviewItem(this.auxiliaryPart, auxiliary), new InterviewItem(this.endPart, end))
            : DomainCollection(new InterviewItem(this.withpagesetsPart, withPageSets), new InterviewItem(this.notificationsPart, notifications));
    }
    apply(survey, participant, interviewItems) {
        const { updatedWorkflow } = this.bindPartItems(survey, interviewItems);
        survey.updateWorkflow(this.workflowIndex, updatedWorkflow);
        if (updatedWorkflow == survey.mainWorkflow && survey.workflows.length > 1) {
            survey.workflows.map((w, index) => {
                if (index != this.workflowIndex)
                    survey.updateWorkflow(index, this.rebuildDerivedWorkflow(survey, w));
            });
        }
    }
    bindPartItems(survey, interviewItems) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const home = getTranslation((_b = (_a = this.workflow) === null || _a === void 0 ? void 0 : _a.info) === null || _b === void 0 ? void 0 : _b.type, "__code__", this.defaultLang);
        const [name, specifier] = (_d = (_c = this.workflow) === null || _c === void 0 ? void 0 : _c.name.split(":")) !== null && _d !== void 0 ? _d : [];
        const initial = (_e = interviewItems.find(i => i.pageItem == this.initialPart)) === null || _e === void 0 ? void 0 : _e.value;
        const followUp = (_f = interviewItems.find(i => i.pageItem == this.followupPart)) === null || _f === void 0 ? void 0 : _f.value;
        const auxiliary = (_g = interviewItems.find(i => i.pageItem == this.auxiliaryPart)) === null || _g === void 0 ? void 0 : _g.value;
        const end = (_h = interviewItems.find(i => i.pageItem == this.endPart)) === null || _h === void 0 ? void 0 : _h.value;
        const withPageSets = (_j = interviewItems.find(i => i.pageItem == this.withpagesetsPart)) === null || _j === void 0 ? void 0 : _j.value;
        const notifications = (_k = interviewItems.find(i => i.pageItem == this.notificationsPart)) === null || _k === void 0 ? void 0 : _k.value;
        const b = new SurveyBuilder();
        let workflowBuilder;
        if (name == "main") {
            workflowBuilder = b.workflow();
            if (home)
                workflowBuilder.home(home);
            if (initial)
                workflowBuilder.initial(...initial);
            if (followUp)
                workflowBuilder.followUp(...followUp);
            if (auxiliary)
                workflowBuilder.auxiliary(...auxiliary);
            if (end)
                workflowBuilder.end(...end);
        }
        else {
            const nameWithSpec = specifier ? `${name}:${specifier}` : name;
            const mainWorkflow = workflowSerialize(survey.mainWorkflow, survey.options);
            workflowDeserialize(b, mainWorkflow);
            workflowBuilder = b.workflow(nameWithSpec);
            if (withPageSets)
                workflowBuilder.withPageSets(...withPageSets);
            if (notifications)
                workflowBuilder.notify(...notifications);
        }
        const updatedWorkflow = workflowBuilder.build([
            ...survey.pageSets,
        ]);
        return { updatedWorkflow };
    }
    canApply(survey, interviewItems) {
        var _a;
        const allParts = [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items];
        return allRequiredSet(allParts, interviewItems);
    }
    rebuildDerivedWorkflow(survey, workflow) {
        const withPageSets = [
            ...workflow.pageSets.map(ps => getTranslation(ps.type, "__code__", this.defaultLang)),
        ];
        const b = new SurveyBuilder();
        const mainWorkflow = workflowSerialize(survey.mainWorkflow, survey.options);
        workflowDeserialize(b, mainWorkflow);
        const workflowBuilder = b
            .workflow(workflow.name)
            .withPageSets(...withPageSets);
        return workflowBuilder.build([...survey.pageSets]);
    }
}

function libUpdateSurveyOptions(b, name, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
    builder
        .question("", "__EPRO__", b.types.yesno)
        .translate("en", "Is this survey an ePRO ?")
        .translate("fr", "Cette étude est-elle un ePRO ?")
        .comment("{.studioWorkflow}")
        .question("", "__SHOW_FILLRATES__", b.types.yesno)
        .translate("en", "Show fillrates on participants ?")
        .translate("fr", "Afficher les taux de remplissage sur les participants ?")
        .comment("{.studioWorkflow}")
        .question("", "__LANGS_TITLE__", b.types.info)
        .translate("en", "Langages options")
        .translate("fr", "Options de langues")
        .comment("{.studioWorkflow.title}")
        .question("", "__AVAILABLE_LANGS__", b.types.text)
        .translate("en", "Available languages")
        .translate("fr", "Langues disponibles")
        .comment("{.studioWorkflow.studioLangSelector.multiple}")
        .question("", "__DEFAULT_LANG__", b.types.text)
        .translate("en", "Default language")
        .translate("fr", "Langue par default")
        .comment("{.studioWorkflow.selectLangs}")
        .question("", "__PARTICIPANT_STRATEGY_TITLE__", b.types.info)
        .translate("en", "Participant code strategy")
        .translate("fr", "Calcul des codes participant")
        .comment("{.studioWorkflow.title}")
        .question("", "__PARTICIPANT_CODE_LENGTH__", b.types.integer)
        .translate("en", "Participant code length")
        .translate("fr", "Longueur du code participant")
        .comment("{.studioWorkflow}")
        .question("", "__PARTICIPANT_CODE_BY_SAMPLE__", b.types.yesno)
        .translate("en", "Calculate participant codes by sample ?")
        .translate("fr", "Calculer les codes participants en fonction du centre ?")
        .comment("{.studioWorkflow}")
        .question("", "__ADVANCED_OPTIONS_TITLE__", b.types.info)
        .translate("en", "Advanced options")
        .translate("fr", "Options avancées")
        .comment("{.studioWorkflow.title}")
        .question("", "__ADVANCED_OPTIONS__", b.types.acknowledge)
        .translate("en", "Advanced options")
        .translate("fr", "Options avancées")
        .comment("{.studioWorkflow}")
        .question("", "__INTERVIEW_DATE_VAR__", b.types.text)
        .translate("en", "Date variable name (visits)")
        .translate("fr", "Variable de date (visites)")
        .comment("{.studioWorkflow}")
        .visibleWhen("__ADVANCED_OPTIONS__ == @ACK")
        .memorize()
        .letterCase("upper")
        .question("", "__PHONE_VAR__", b.types.text)
        .translate("en", "Phone number variable")
        .translate("fr", "Variable pour les numéros de téléphone")
        .comment("{.studioWorkflow}")
        .visibleWhen("__ADVANCED_OPTIONS__ == @ACK")
        .memorize()
        .letterCase("upper")
        .question("", "__EMAIL_VAR__", b.types.text)
        .translate("en", "Email variable")
        .translate("fr", "Variable pour les emails")
        .comment("{.studioWorkflow}")
        .visibleWhen("__ADVANCED_OPTIONS__ == @ACK")
        .memorize()
        .letterCase("upper")
        .question("", "__CONSENT_VAR__", b.types.text)
        .translate("en", "Consent variable")
        .translate("fr", "Variable pour le consentement")
        .comment("{.studioWorkflow}")
        .visibleWhen("__ADVANCED_OPTIONS__ == @ACK")
        .memorize()
        .letterCase("upper")
        .question("", "__UNIT_SUFFIX__", b.types.text)
        .translate("en", "Unit suffix")
        .translate("fr", "Suffixe des unités")
        .comment("{.studioWorkflow}")
        .visibleWhen("__ADVANCED_OPTIONS__ == @ACK")
        .memorize()
        .letterCase("upper")
        .question("", "__INC_VAR__", b.types.text)
        .translate("en", "Inclusion variable code")
        .translate("fr", "Code de la variable d'inclusion")
        .comment("{.studioWorkflow}")
        .visibleWhen("__ADVANCED_OPTIONS__ == @ACK")
        .memorize()
        .letterCase("upper")
        .question("", "__SIGN_VAR__", b.types.text)
        .translate("en", "Signature variable code")
        .translate("fr", "Code de la variable de signature")
        .comment("{.studioWorkflow}")
        .visibleWhen("__ADVANCED_OPTIONS__ == @ACK")
        .memorize()
        .letterCase("upper");
    if (section)
        builder.endSection();
    return builder;
}

class UpdateSurveyOptionsCommand {
    get applyPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__APPLY__");
    }
    get eproPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__EPRO__");
    }
    get fillratesPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__SHOW_FILLRATES__");
    }
    get availableLangsPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__AVAILABLE_LANGS__");
    }
    get defaultLangPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__DEFAULT_LANG__");
    }
    get participantCodeLengthPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__PARTICIPANT_CODE_LENGTH__");
    }
    get participantCodeBySitePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__PARTICIPANT_CODE_BY_SAMPLE__");
    }
    get interviewDatePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__INTERVIEW_DATE_VAR__");
    }
    get phonePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__PHONE_VAR__");
    }
    get emailPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__EMAIL_VAR__");
    }
    get unitSuffixPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__UNIT_SUFFIX__");
    }
    get inclusionPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__INC_VAR__");
    }
    buildParts(survey, section = {
        en: "Update survey options",
        fr: "Mise à jour des options de l'étude",
    }) {
        const b = new SurveyBuilder();
        libUpdateSurveyOptions(b, "updatesurveyoptions", section);
        libApply(b, "apply", section);
        this.parts = b.get();
    }
    start(survey, participant, pageSetIndex, section) {
        var _a, _b;
        this.pageSetIndex = pageSetIndex;
        this.pageIndex = 0;
        this.surveyOptions = survey.options;
        this.buildParts(survey, section);
        this.page = this.buildOptionPage(survey);
        survey.insertPage(pageSetIndex, 0, this.page);
        this.surveyPageIndex = survey.pages.indexOf(this.page);
        survey.insertItems(this.surveyPageIndex, 0, [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.crossRules]);
        participant.updatePageSets(survey.pageSets);
        participant.insertItems(this.getPartItems());
    }
    buildOptionPage(survey) {
        const b = new SurveyBuilder();
        b.options(survey.options);
        const pageBuilder = b
            .page("Survey options")
            .translate("fr", "Options de l'étude");
        return pageBuilder.build([]);
    }
    getPartItems() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        const languages = (_a = this.surveyOptions) === null || _a === void 0 ? void 0 : _a.languages;
        const defaultLang = (_b = this.surveyOptions) === null || _b === void 0 ? void 0 : _b.defaultLang;
        const epro = boolToInt(!!((_c = this.surveyOptions) === null || _c === void 0 ? void 0 : _c.epro));
        const fillRate = boolToInt(!!((_d = this.surveyOptions) === null || _d === void 0 ? void 0 : _d.showFillRate));
        const participantCodeLength = (_f = (_e = this.surveyOptions) === null || _e === void 0 ? void 0 : _e.participantCodeStrategy) === null || _f === void 0 ? void 0 : _f.length;
        const participantCodeBySite = boolToInt(!!((_h = (_g = this.surveyOptions) === null || _g === void 0 ? void 0 : _g.participantCodeStrategy) === null || _h === void 0 ? void 0 : _h.bySample));
        const interviewDateVar = (_j = this.surveyOptions) === null || _j === void 0 ? void 0 : _j.interviewDateVar;
        const phoneVar = (_k = this.surveyOptions) === null || _k === void 0 ? void 0 : _k.phoneVar;
        const emailVar = (_l = this.surveyOptions) === null || _l === void 0 ? void 0 : _l.emailVar;
        const unitSuffix = (_m = this.surveyOptions) === null || _m === void 0 ? void 0 : _m.unitSuffix;
        const inclusionPart = (_p = (_o = this.surveyOptions) === null || _o === void 0 ? void 0 : _o.inclusionVar) === null || _p === void 0 ? void 0 : _p.name;
        return DomainCollection(new InterviewItem(this.availableLangsPart, languages), new InterviewItem(this.defaultLangPart, defaultLang), new InterviewItem(this.eproPart, epro), new InterviewItem(this.fillratesPart, fillRate), new InterviewItem(this.participantCodeLengthPart, participantCodeLength), new InterviewItem(this.participantCodeBySitePart, participantCodeBySite), new InterviewItem(this.interviewDatePart, interviewDateVar), new InterviewItem(this.phonePart, phoneVar), new InterviewItem(this.emailPart, emailVar), new InterviewItem(this.unitSuffixPart, unitSuffix), new InterviewItem(this.inclusionPart, inclusionPart));
    }
    apply(survey, participant, interviewItems) {
        const { updatedOptions } = this.bindPartItems(survey, interviewItems);
        survey.updateOptions(updatedOptions);
    }
    bindPartItems(survey, interviewItems) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const languages = (_a = interviewItems.find(ii => ii.pageItem == this.availableLangsPart)) === null || _a === void 0 ? void 0 : _a.value;
        const defaultLang = (_b = interviewItems.find(ii => ii.pageItem == this.defaultLangPart)) === null || _b === void 0 ? void 0 : _b.value;
        const visitDateVar = (_c = interviewItems.find(ii => ii.pageItem == this.interviewDatePart)) === null || _c === void 0 ? void 0 : _c.value;
        const phoneVar = (_d = interviewItems.find(ii => ii.pageItem == this.phonePart)) === null || _d === void 0 ? void 0 : _d.value;
        const emailVar = (_e = interviewItems.find(ii => ii.pageItem == this.emailPart)) === null || _e === void 0 ? void 0 : _e.value;
        const showFillRate = !!((_f = interviewItems.find(ii => ii.pageItem == this.fillratesPart)) === null || _f === void 0 ? void 0 : _f.value);
        const epro = !!((_g = interviewItems.find(ii => ii.pageItem == this.eproPart)) === null || _g === void 0 ? void 0 : _g.value);
        const inclusionVarCode = (_h = interviewItems.find(ii => ii.pageItem == this.inclusionPart)) === null || _h === void 0 ? void 0 : _h.value;
        const unitSuffix = (_j = interviewItems.find(ii => ii.pageItem == this.unitSuffixPart)) === null || _j === void 0 ? void 0 : _j.value;
        const participantCodeLength = (_k = interviewItems.find(ii => ii.pageItem == this.participantCodeLengthPart)) === null || _k === void 0 ? void 0 : _k.value;
        const participantCodeBySite = !!((_l = interviewItems.find(ii => ii.pageItem == this.participantCodeBySitePart)) === null || _l === void 0 ? void 0 : _l.value);
        const surveyOptions = this.buidOptions(languages, defaultLang, visitDateVar, phoneVar, emailVar, showFillRate, epro, inclusionVarCode, unitSuffix, participantCodeLength, participantCodeBySite);
        const b = new SurveyBuilder();
        b.options(surveyOptions);
        return { updatedOptions: b.get().options };
    }
    buidOptions(languages, defaultLang, visitDateVar, phoneVar, emailVar, showFillRate, epro, inclusionVarCode, unitSuffix, participantCodeLength, participantCodeBySite) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (languages ? { languages } : {})), (defaultLang ? { defaultLang } : {})), (visitDateVar ? { visitDateVar } : {})), (phoneVar ? { phoneVar } : {})), (emailVar ? { emailVar } : {})), (typeof showFillRate != "undefined"
            ? { showFillRate: showFillRate }
            : {})), (typeof epro != "undefined" ? { epro: epro } : {})), { inclusionVar: {
                name: inclusionVarCode !== null && inclusionVarCode !== void 0 ? inclusionVarCode : (_b = (_a = this.surveyOptions) === null || _a === void 0 ? void 0 : _a.inclusionVar) === null || _b === void 0 ? void 0 : _b.name,
                hidden: (_d = (_c = this.surveyOptions) === null || _c === void 0 ? void 0 : _c.inclusionVar) === null || _d === void 0 ? void 0 : _d.hidden,
            } }), (unitSuffix ? { unitSuffix } : {})), { participantCodeStrategy: {
                length: participantCodeLength !== null && participantCodeLength !== void 0 ? participantCodeLength : (_f = (_e = this.surveyOptions) === null || _e === void 0 ? void 0 : _e.participantCodeStrategy) === null || _f === void 0 ? void 0 : _f.length,
                bySite: participantCodeBySite !== null && participantCodeBySite !== void 0 ? participantCodeBySite : (_h = (_g = this.surveyOptions) === null || _g === void 0 ? void 0 : _g.participantCodeStrategy) === null || _h === void 0 ? void 0 : _h.bySample,
            } });
    }
    canApply() {
        return true;
    }
}
function boolToInt(bool) {
    return bool ? 1 : 0;
}

function libInsertItem(b, name, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
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
    if (section)
        builder.endSection();
    return builder;
}

class UniquePageItemRule {
    constructor(survey) {
        this.survey = survey;
        this.name = "unique";
        this.precedence = 100;
    }
    execute(a) {
        const messages = setMessageIf(!!this.survey.items.find(i => i.variableName == a.value))(a.messages, "unique", "variable name must be unique");
        return update(a, { messages });
    }
}
class InsertItemCommand {
    constructor() {
        this.updateCommand = new UpdateItemCommand();
    }
    buildParts(survey, section) {
        const builder = new SurveyBuilder();
        libInsertItem(builder, "insertItem", section);
        this.parts = builder.get();
        this.parts = this.parts.update({
            crossRules: this.parts.crossRules.append(new CrossItemRule(this.variableNamePart, new UniquePageItemRule(survey))),
        });
    }
    get variableNamePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_VARIABLE_NAME__");
    }
    get isRecordPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_ISRECORD__");
    }
    start(survey, participant, pageIndex, index, section) {
        var _a, _b;
        this.pageIndex = pageIndex;
        this.pageItemIndex = index;
        this.item = this.buildNewItem(survey, section);
        survey.insertItem(pageIndex, index, this.item, []);
        this.updateCommand.start(survey, participant, pageIndex, index);
        this.buildParts(survey, section);
        survey.insertItems(this.pageIndex, this.pageItemIndex + 1, [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.crossRules]);
        participant.updatePageSets(survey.pageSets);
        participant.insertItems(this.getPartItems());
    }
    buildNewItem(survey, section) {
        const b = new SurveyBuilder();
        b.options(survey.value.options);
        const pageItemBuilder = b.question({ en: "New Item", fr: "Nouvelle Question" }, "NEW_ITEM", b.types.text, section);
        return pageItemBuilder.build([]);
    }
    getPartItems() {
        var _a;
        const variableName = (_a = this.item) === null || _a === void 0 ? void 0 : _a.variableName;
        return DomainCollection(...this.getPartMessages(new InterviewItem(this.variableNamePart, variableName), new InterviewItem(this.isRecordPart, undefined)));
    }
    getPartMessages(...items) {
        const scope = Scope.create([]).with(items);
        return execute(this.parts.rules, scope).items;
    }
    apply(survey, participant, interviewItems) {
        const { insertedItem, insertedRules } = this.bindPartItems(survey.value, interviewItems);
        survey.insertItem(this.pageIndex, this.pageItemIndex, insertedItem, insertedRules);
        participant.updatePageSets(survey.pageSets);
        participant.insertItem(insertedItem);
    }
    bindPartItems(survey, interviewItems) {
        var _a;
        const { updatedItem, updatedRules } = this.updateCommand.bindPartItems(survey, interviewItems);
        const variableName = (_a = interviewItems.find(i => i.pageItem == this.variableNamePart)) === null || _a === void 0 ? void 0 : _a.value;
        const isRecord = interviewItems.some(i => i.pageItem == this.isRecordPart && !!i.value);
        const wording = isRecord
            ? this.toRecord(updatedItem.wording)
            : updatedItem.wording;
        const insertedItem = updatedItem.update({
            variableName: variableName,
            wording,
        });
        const insertedRules = updatedRules.map(r => new CrossItemRule(r.pageItems.update(i => getScopedItem(i) == updatedItem ? [insertedItem, getScope(i)] : i), Rules.create(Object.assign({ name: r.name }, r.args)), r.when));
        return { insertedItem, insertedRules };
    }
    toRecord(wording) {
        if (Array.isArray(wording))
            return wording.map(w => this.toRecord(w));
        if (isML(wording))
            return Object.entries(wording).reduce((res, [lang, w]) => {
                return Object.assign(Object.assign({}, res), { [lang]: this.toRecord(w) });
            }, {});
        return ` -> ${wording}`;
    }
    canApply(survey, interviewItems) {
        var _a, _b;
        const allParts = [
            ...(_a = this.updateCommand.parts) === null || _a === void 0 ? void 0 : _a.items,
            ...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.items,
        ];
        return (allRequiredSet(allParts, interviewItems) &&
            allUniqueSet(allParts, interviewItems));
    }
}

function libInsertPage(b, name, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
    builder
        .question("", "__PAGE_CODE__", b.types.text)
        .translate("en", "Code:")
        .translate("fr", "Code :")
        .comment("{.studioPage}")
        .letterCase("upper")
        .required();
    if (section)
        builder.endSection();
    return builder;
}

class UniquePageRule {
    constructor(survey, page) {
        this.survey = survey;
        this.page = page;
        this.name = "unique";
        this.precedence = 100;
    }
    execute(a) {
        const messages = setMessageIf(this.pageAlreadyExist(a.value))(a.messages, "unique", "page name must be unique");
        return update(a, { messages });
    }
    pageAlreadyExist(pageCode) {
        return !!this.survey.pages.find(p => getTranslation(p.name, "__code__", this.survey.options.defaultLang) ==
            pageCode);
    }
}
class InsertPageCommand {
    constructor() {
        this.updateCommand = new UpdatePageCommand();
    }
    buildParts(survey) {
        var _a;
        const builder = new SurveyBuilder();
        libInsertPage(builder, "insertPage", {
            en: "Insert Page",
            fr: "Insérer une page",
        });
        this.parts = builder.get();
        this.parts = (_a = this.parts) === null || _a === void 0 ? void 0 : _a.update({
            crossRules: this.parts.crossRules.append(new CrossItemRule(this.codePart, new UniquePageRule(survey, this.page))),
        });
    }
    get codePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__PAGE_CODE__");
    }
    start(survey, participant, pageSetIndex, pageIndex) {
        var _a, _b;
        this.pageSetIndex = pageSetIndex;
        this.pageIndex = pageIndex;
        this.indexNewPage = pageIndex;
        this.defaultLang = survey.options.defaultLang;
        this.page = this.buildNewPage();
        survey.insertPage(pageSetIndex, pageIndex, this.page);
        this.surveyPageIndex = survey.pages.findIndex(page => page == this.page);
        this.updateCommand.start(survey, participant, this.surveyPageIndex, {
            en: "Insert Page",
            fr: "Insérer une page",
        });
        this.buildParts(survey);
        survey.insertItems(this.surveyPageIndex, 0, [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.crossRules]);
        participant.updatePageSets(survey.pageSets);
        participant.insertItems(this.getPartItems());
    }
    buildNewPage() {
        const pageBuilder = new SurveyBuilder()
            .page("PAGE")
            .translate("en", "New Page")
            .translate("fr", "Nouvelle Page");
        return pageBuilder.build([]);
    }
    getPartItems() {
        var _a;
        const code = getTranslation((_a = this.page) === null || _a === void 0 ? void 0 : _a.name, "__code__", this.defaultLang);
        return DomainCollection(...this.getPartMessages(new InterviewItem(this.codePart, code)));
    }
    getPartMessages(...items) {
        const scope = Scope.create([]).with(items);
        return execute(this.parts.rules, scope).items;
    }
    apply(survey, participant, interviewItems) {
        const { insertedPage } = this.bindPartItems(survey, interviewItems);
        survey.insertPage(this.pageSetIndex, this.indexNewPage, insertedPage);
        this.updateCommand.applyInclude(survey, participant, interviewItems);
        participant.updatePageSets(survey.pageSets);
    }
    bindPartItems(survey, interviewItems) {
        var _a;
        const code = {
            __code__: (_a = interviewItems.find(i => i.pageItem == this.codePart)) === null || _a === void 0 ? void 0 : _a.value,
        };
        const { updatedPage } = this.updateCommand.bindPartItems(survey, interviewItems);
        const insertedPage = updatedPage.update({
            name: Object.assign(Object.assign({}, (typeof updatedPage.name == "string"
                ? { [survey.options.defaultLang]: updatedPage.name }
                : updatedPage.name)), code),
        });
        return { insertedPage };
    }
    canApply(survey, interviewItems) {
        var _a, _b;
        const allParts = [
            ...(_a = this.updateCommand.parts) === null || _a === void 0 ? void 0 : _a.items,
            ...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.items,
        ];
        return (allRequiredSet(allParts, interviewItems) &&
            allUniqueSet(allParts, interviewItems));
    }
}

function libInsertPageSet(b, name, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
    builder
        .question("", "__PAGE_SET_CODE__", b.types.text)
        .translate("en", "Code:")
        .translate("fr", "Code :")
        .comment("{.studioPageSet}")
        .letterCase("upper")
        .required();
    if (section)
        builder.endSection();
    return builder;
}

class UniquePageSetRule {
    constructor(survey, pageSet) {
        this.survey = survey;
        this.pageSet = pageSet;
        this.name = "unique";
        this.precedence = 100;
    }
    execute(a) {
        const messages = setMessageIf(this.pageSetAlreadyExist(a.value))(a.messages, "unique", "page set code must be unique");
        return update(a, { messages });
    }
    pageSetAlreadyExist(pageSetCode) {
        return !!this.survey.pageSets.find(p => getTranslation(p.type, "__code__", this.survey.options.defaultLang) ==
            pageSetCode);
    }
}
class InsertPageSetCommand {
    constructor() {
        this.updateCommand = new UpdatePageSetCommand();
    }
    get codePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__PAGE_SET_CODE__");
    }
    buildParts(survey, section = {
        en: "New visit type",
        fr: "Nouvelle visite type",
    }) {
        var _a;
        const builder = new SurveyBuilder();
        libInsertPageSet(builder, "insertPageSet", section);
        this.parts = builder.get();
        this.parts = (_a = this.parts) === null || _a === void 0 ? void 0 : _a.update({
            crossRules: this.parts.crossRules.append(new CrossItemRule(this.codePart, new UniquePageSetRule(survey, this.pageSet))),
        });
    }
    start(survey, participant, section) {
        var _a, _b;
        this.defaultLang = survey.options.defaultLang;
        this.pageSet = this.buildNewPageSet();
        survey.insertPageSet(this.pageSet);
        participant.insertPageSet(this.pageSet, survey.options);
        this.pageSetIndex = survey.pageSets.findIndex(ps => ps == this.pageSet);
        this.updateCommand.start(survey, participant, this.pageSetIndex, section !== null && section !== void 0 ? section : {
            en: "New visit type",
            fr: "Nouveau type de visite",
        });
        this.pageIndex = this.updateCommand.pageIndex;
        this.surveyPageIndex = this.updateCommand.surveyPageIndex;
        this.buildParts(survey, section);
        survey.insertItems(this.surveyPageIndex, 0, [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.crossRules]);
        participant.updatePageSets(survey.pageSets);
        participant.insertItems(this.getPartItems());
    }
    buildNewPageSet() {
        const pageSetBuilder = new SurveyBuilder()
            .pageSet("NEWPAGESET")
            .translate("en", "New Visit")
            .translate("fr", "Nouvelle Visite");
        return pageSetBuilder.build([]);
    }
    getPartItems() {
        var _a;
        const code = getTranslation((_a = this.pageSet) === null || _a === void 0 ? void 0 : _a.type, "__code__", this.defaultLang);
        return DomainCollection(...this.getPartMessages(new InterviewItem(this.codePart, code)));
    }
    getPartMessages(...items) {
        const scope = Scope.create([]).with(items);
        return execute(this.parts.rules, scope).items;
    }
    apply(survey, participant, interviewItems) {
        const { insertedPageSet } = this.bindPartItems(survey.value, interviewItems);
        survey.insertPageSet(insertedPageSet);
        participant.updatePageSets(survey.pageSets);
        participant.insertPageSet(insertedPageSet, survey.options);
    }
    bindPartItems(survey, interviewItems) {
        var _a;
        const code = {
            __code__: (_a = interviewItems.find(i => i.pageItem == this.codePart)) === null || _a === void 0 ? void 0 : _a.value,
        };
        const { updatedPageSet } = this.updateCommand.bindPartItems(survey, interviewItems);
        const insertedPageSet = updatedPageSet.update({
            type: Object.assign(Object.assign({}, (typeof updatedPageSet.type == "string"
                ? { [this.defaultLang]: updatedPageSet.type }
                : updatedPageSet.type)), code),
        });
        return { insertedPageSet };
    }
    canApply(survey, interviewItems) {
        var _a, _b;
        const allParts = [
            ...(_a = this.updateCommand.parts) === null || _a === void 0 ? void 0 : _a.items,
            ...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.items,
        ];
        return (allRequiredSet(allParts, interviewItems) &&
            allUniqueSet(allParts, interviewItems));
    }
}

function libInsertDerivedWorkflow(b, name, survey, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
    builder
        .question("", "__WORKFLOW_NAME__", b.types
        .choice("many", "participant", "administrator", "investigator", "dataadministrator", "surveycoordinator", "cst", "cra", "datamanager", "deo")
        .translate("en", "Participant", "Administrator", "Investigator", "Data Administrator", "Survey Coordinator", "Clinical Survey Technician (CST)", "Clinical Research associate (CRA)", "Data Manager", "Data entry operator")
        .translate("fr", "Participant", "Administrateur", "Investigateur", "Administrateur Données", "Coordinateur d'Etude", "Technicien d'étude clinique (TEC)", "Associé Recherche Clinique (ARC)", "Data Manager", "Opérateur de saisie"))
        .translate("en", "Workflow associated role :")
        .translate("fr", "Role associé au workflow :")
        .required()
        .comment("{.studioWorkflow.column}")
        .question("", "__WORKFLOW_SPECIFIER__", b.types.text)
        .translate("en", "Specifier : ")
        .translate("fr", "Spécificateur : ")
        .comment("{.studioWorkflow}");
    if (section)
        builder.endSection();
    return builder;
}

class UniqueWorkflowRule {
    constructor(survey, workflow) {
        this.survey = survey;
        this.workflow = workflow;
        this.name = "unique";
        this.precedence = 100;
    }
    execute(names, spec) {
        const messages = setMessageIf(this.workflowAlreadyExist(names.value, spec.value))(spec.messages, "unique", "workflow name:specifier must be unique");
        return [names, update(spec, { messages: Object.assign({}, messages) })];
    }
    workflowAlreadyExist(names, spec) {
        const namesWithWpec = names === null || names === void 0 ? void 0 : names.map(name => `${name}${spec ? `:${spec}` : ""}`);
        return this.survey.workflows.some(w => namesWithWpec === null || namesWithWpec === void 0 ? void 0 : namesWithWpec.includes(w.name));
    }
}
class InsertWorkflowCommand {
    constructor() {
        this.updateCommand = new UpdateWorkflowCommand();
    }
    buildParts(survey, section) {
        var _a;
        const builder = new SurveyBuilder();
        libInsertDerivedWorkflow(builder, "updateWorkflow", survey, section);
        this.parts = builder.get();
        this.parts = (_a = this.parts) === null || _a === void 0 ? void 0 : _a.update({
            crossRules: this.parts.crossRules.append(new CrossItemRule(DomainCollection(this.namePart, this.specifierPart), new UniqueWorkflowRule(survey, this.workflow))),
        });
    }
    get namePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__WORKFLOW_NAME__");
    }
    get specifierPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__WORKFLOW_SPECIFIER__");
    }
    start(survey, participant, pageSetIndex) {
        var _a, _b;
        this.pageSetIndex = pageSetIndex;
        this.workflow = this.buildNewWorkflow();
        survey.insertWorkflow(this.workflow);
        this.workflowIndex = survey.workflows.findIndex(w => w == this.workflow);
        const section = { en: "Insert Workflow", fr: "Insérer un workflow" };
        this.updateCommand.start(survey, participant, this.workflowIndex, pageSetIndex, section);
        this.pageIndex = this.updateCommand.pageIndex;
        this.surveyPageIndex = this.updateCommand.surveyPageIndex;
        this.buildParts(survey, section);
        survey.insertItems(this.surveyPageIndex, 0, [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.crossRules]);
        participant.updatePageSets(survey.pageSets);
        participant.insertItems(this.getPartItems());
    }
    getPartItems() {
        return DomainCollection(...this.getPartMessages(new InterviewItem(this.namePart, undefined), new InterviewItem(this.specifierPart, undefined)));
    }
    getPartMessages(...items) {
        const scope = Scope.create([]).with(items);
        return execute(this.parts.rules, scope).items;
    }
    buildNewWorkflow() {
        const workflowBuilder = new SurveyBuilder().workflow();
        const workflow = workflowBuilder.build([]);
        return workflow.update({ name: "" });
    }
    apply(survey, participant, interviewItems) {
        const { insertedWorkflows } = this.bindPartItems(survey.value, interviewItems);
        for (const workflow of insertedWorkflows)
            survey.insertWorkflow(workflow);
    }
    bindPartItems(survey, interviewItems) {
        var _a, _b;
        const { updatedWorkflow } = this.updateCommand.bindPartItems(survey, interviewItems);
        const names = (_a = interviewItems.find(i => i.pageItem == this.namePart)) === null || _a === void 0 ? void 0 : _a.value;
        const specifier = (_b = interviewItems.find(i => i.pageItem == this.specifierPart)) === null || _b === void 0 ? void 0 : _b.value;
        const insertedWorkflows = names.map(name => {
            const nameWithSpec = specifier ? `${name}:${specifier}` : name;
            return updatedWorkflow.update({ name: nameWithSpec });
        });
        return { insertedWorkflows };
    }
    canApply(survey, interviewItems) {
        var _a, _b;
        const allParts = [
            ...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items,
            ...(_b = this.updateCommand.parts) === null || _b === void 0 ? void 0 : _b.items,
        ];
        return (allRequiredSet(allParts, interviewItems) &&
            allUniqueSet(allParts, interviewItems));
    }
}

function libInsertTableLine(b, name, section, table) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
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
    if (section)
        builder.endSection();
    return builder;
}

class InsertTableLineCommand {
    buildParts(survey, section, table) {
        const builder = new SurveyBuilder();
        libInsertTableLine(builder, "insertTableLine", section, table);
        libApply(builder, "apply", section);
        this.parts = builder.get();
    }
    get columnNamesPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__COLUMN_NAMES__");
    }
    get lineNamePart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__LINE_NAME__");
    }
    get positionPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__LINE_POSITION__");
    }
    start(survey, participant, pageIndex, index, section) {
        var _a, _b;
        this.pageIndex = pageIndex;
        this.pageItemIndex = index;
        this.section = section;
        this.precedingTable = this.getPrecedingTable(survey, pageIndex, index);
        this.buildParts(survey, section, this.precedingTable);
        survey.insertItems(this.pageIndex, this.pageItemIndex, [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.crossRules]);
        const interviewItems = this.getPartItems(this.precedingTable);
        participant.updatePageSets(survey.pageSets);
        participant.insertItems(interviewItems);
    }
    getPrecedingTable(survey, pageIndex, pageItemIndex) {
        const item = survey.pages[pageIndex].items[pageItemIndex - 1];
        const layout = parseLayout(survey.pages[pageIndex].items);
        const tableContainingItem = layout
            .flatMap(s => s.content)
            .find(c => {
            switch (c.behavior) {
                case "table":
                    return !!c.items.find(r => !!r.row.find(i => getItem(i === null || i === void 0 ? void 0 : i.item) == getItem(item)));
                case "item" :
                    return getItem(c.item) == getItem(item);
                case "recordset":
                    return false;
            }
        });
        return tableContainingItem && tableContainingItem.behavior == "table"
            ? tableContainingItem
            : undefined;
    }
    getPartItems(table) {
        if (!table)
            return DomainCollection(new InterviewItem(this.positionPart, 1));
        const columnNames = table
            ? table.columns.map(c => ({ name: "", label: c }))
            : [];
        return DomainCollection(new InterviewItem(this.positionPart, table.items.length + 1), new InterviewItem(this.columnNamesPart, columnNames));
    }
    apply(survey, participant, interviewItems) {
        const { insertedItems, insertedRules } = this.bindPartItems(survey.value, interviewItems);
        const lineIndex = this.getPosition(survey, participant, interviewItems);
        survey.insertItems(this.pageIndex, lineIndex, insertedItems, insertedRules);
        participant.updatePageSets(survey.pageSets);
        participant.insertItems(DomainCollection(...insertedItems));
    }
    getPosition(survey, participant, interviewItems) {
        var _a, _b, _c;
        const position = (_a = interviewItems.find(ii => ii.pageItem == this.positionPart)) === null || _a === void 0 ? void 0 : _a.value;
        if (position &&
            this.precedingTable &&
            position <= ((_c = (_b = this.precedingTable) === null || _b === void 0 ? void 0 : _b.items) === null || _c === void 0 ? void 0 : _c.length)) {
            const rowIndex = position - 1;
            return survey.pages[this.pageIndex].items.findIndex(pi => { var _a, _b; return pi == ((_b = (_a = this.precedingTable) === null || _a === void 0 ? void 0 : _a.items[rowIndex].row[0]) === null || _b === void 0 ? void 0 : _b.item); });
        }
        return this.pageItemIndex;
    }
    bindPartItems(survey, interviewItems) {
        var _a, _b, _c, _d, _e;
        const b = new SurveyBuilder();
        b.options(survey.options);
        const lineName = (_a = interviewItems.find(ii => ii.pageItem == this.lineNamePart)) === null || _a === void 0 ? void 0 : _a.value;
        const columnsNames = (_c = (_b = interviewItems.find(ii => ii.pageItem == this.columnNamesPart)) === null || _b === void 0 ? void 0 : _b.value) === null || _c === void 0 ? void 0 : _c.map(c => c.label);
        const varNames = (_e = (_d = interviewItems.find(ii => ii.pageItem == this.columnNamesPart)) === null || _d === void 0 ? void 0 : _d.value) === null || _e === void 0 ? void 0 : _e.map(c => c.name);
        const insertedItems = columnsNames.map((colName, index) => {
            var _a;
            let pageItemBuilder = b.question(`${getTranslation(lineName, survey.options.defaultLang)} -> ${getTranslation(colName, survey.options.defaultLang)}`, varNames[index], b.types.text, this.section);
            (_a = survey.options.languages) === null || _a === void 0 ? void 0 : _a.filter(l => l != survey.options.defaultLang).map(l => (pageItemBuilder = pageItemBuilder.translate(l, `${getTranslation(lineName, l)} -> ${getTranslation(colName, l)}`)));
            return pageItemBuilder.build([]);
        });
        return { insertedItems, insertedRules: [] };
    }
    canApply(survey, interviewItems) {
        var _a, _b;
        return (allRequiredSet([...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], interviewItems) &&
            allInRangeSet([...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.items], interviewItems));
    }
}

function libDeleteItem(b, name, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
    builder
        .question("", "__INFO_DELETION__", b.types.info)
        .translate("en", "Are you sure you want to delete this element ?")
        .translate("fr", "Êtes-vous sûr de vouloir supprimer cet élément ?")
        .comment("{.studio.studioItem}");
    if (section)
        builder.endSection();
    return builder;
}

class DeleteItemCommand {
    constructor() {
        this.count = 1;
    }
    get applyPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__APPLY__");
    }
    buildParts(section) {
        const builder = new SurveyBuilder();
        libDeleteItem(builder, "updateItem", section);
        libApply(builder, "apply", section);
        this.parts = builder.get();
    }
    start(survey, participant, pageIndex, index, count = 1) {
        var _a, _b, _c;
        this.pageIndex = pageIndex;
        this.count = count;
        this.items = survey.value.pages[pageIndex].items
            .slice(index, index + count)
            .map(i => getItem(i));
        this.pageItemIndex = index;
        this.buildParts((_a = this.items.last) === null || _a === void 0 ? void 0 : _a.section);
        survey.insertItems(pageIndex, index + count, [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.items], [...(_c = this.parts) === null || _c === void 0 ? void 0 : _c.crossRules]);
        participant.updatePageSets(survey.pageSets);
    }
    apply(survey, participant) {
        for (let i = 0; i < this.count; i++) {
            survey.deleteItem(this.pageIndex, this.pageItemIndex);
        }
        participant.updatePageSets(survey.pageSets);
        for (const item of this.items) {
            participant.deleteItem(item);
        }
        this.pageItemIndex = -1;
    }
    canApply() {
        return true;
    }
}

function libDeletePage(b, name, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
    builder
        .question("", "__INFO_DELETION__", b.types.info)
        .translate("en", "Are you sure you want to delete this element ?")
        .translate("fr", "Êtes-vous sûr de vouloir supprimer cet élément ?")
        .comment("{.studioPage}");
    if (section)
        builder.endSection();
    return builder;
}

class DeletePageCommand {
    get applyPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__APPLY__");
    }
    buildParts(survey, section = {
        en: "Delete Page",
        fr: "Suppression de la page",
    }) {
        const builder = new SurveyBuilder();
        libDeletePage(builder, "deletePage", section);
        libApply(builder, "apply", section);
        this.parts = builder.get();
    }
    start(survey, participant, pageSetIndex, pageIndex) {
        var _a, _b;
        this.pageSetIndex = pageSetIndex;
        this.pageIndex = pageIndex;
        this.pageSet = survey.value.pageSets[pageSetIndex];
        this.page = this.pageSet.pages[pageIndex];
        this.buildParts(survey, {
            en: `Delete page "${getTranslation(this.page.name, "en")}"`,
            fr: `Suppression de la page "${getTranslation(this.page.name, "fr")}"`,
        });
        const pageIndexInSurvey = survey.value.pages.findIndex(page => page == this.page);
        survey.insertItems(pageIndexInSurvey, 0, [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.crossRules]);
        participant.updatePageSets(survey.pageSets);
    }
    apply(survey, participant) {
        survey.deletePage(this.pageSetIndex, this.pageIndex);
        participant.updatePageSets(survey.pageSets);
        participant.deleteItems(this.page.items);
        this.pageIndex = -1;
    }
    canApply() {
        return true;
    }
}

function libDeletePageSet(b, name, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
    builder
        .question("", "__INFO_DELETION__", b.types.info)
        .translate("en", "Are you sure you want to delete this element ?")
        .translate("fr", "Etes vous sur de vouloir supprimer cet élément ?")
        .comment("{.studioPageSet}");
    if (section)
        builder.endSection();
    return builder;
}

class DeletePageSetCommand {
    get applyPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__APPLY__");
    }
    buildParts(survey, section = {
        en: "Delete pageset",
        fr: "Suppression du pageset",
    }) {
        const builder = new SurveyBuilder();
        libDeletePageSet(builder, "delete", section);
        libApply(builder, "apply", section);
        this.parts = builder.get();
    }
    start(survey, participant, pageSetIndex) {
        var _a, _b;
        this.pageSetIndex = pageSetIndex;
        this.pageSet = survey.pageSets[this.pageSetIndex];
        this.buildParts(survey, {
            en: `Delete pageset "${getTranslation(this.pageSet.type, "en")}"`,
            fr: `Suppression du pageset "${getTranslation(this.pageSet.type, "fr")}"`,
        });
        const b = new SurveyBuilder();
        b.options(survey.options);
        const pagebuilder = b
            .page("Visit Parameters")
            .translate("fr", "Paramètres de la visite");
        this.page = pagebuilder.build([]);
        survey.insertPage(pageSetIndex, 0, this.page);
        this.pageIndex = survey.pageSets[this.pageSetIndex].pages.indexOf(this.page);
        this.surveyPageIndex = survey.pages.indexOf(this.page);
        survey.insertItems(this.surveyPageIndex, 0, [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.crossRules]);
        participant.updatePageSets(survey.pageSets);
    }
    apply(survey, participant) {
        survey.deletePageSet(this.pageSetIndex);
        participant.deletePageSet(this.pageSet);
        this.pageSetIndex = -1;
        this.pageIndex = -1;
    }
    canApply() {
        return true;
    }
}

function libDeleteWorkflow(b, name, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
    builder
        .question("", "__INFO_DELETION__", b.types.info)
        .translate("en", "Are you sure you want to delete this element ?")
        .translate("fr", "Êtes-vous sûr de vouloir supprimer cet élément ?")
        .comment("{.studioWorkflow}");
    if (section)
        builder.endSection();
    return builder;
}

class DeleteWorkflowCommand {
    get applyPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__APPLY__");
    }
    buildParts(survey, section = {
        en: "Delete Workflow",
        fr: "Suppression du workflow",
    }) {
        const builder = new SurveyBuilder();
        libDeleteWorkflow(builder, "delete", section);
        libApply(builder, "apply", section);
        this.parts = builder.get();
    }
    start(survey, participant, workflowIndex, pageSetIndex) {
        var _a, _b;
        this.workflowIndex = workflowIndex;
        this.workflow = survey.value.workflows[this.workflowIndex];
        this.pageSetIndex = pageSetIndex;
        this.buildParts(survey, {
            en: `Delete workflow "${this.workflow.name}"`,
            fr: `Suppression du workflow "${this.workflow.name}"`,
        });
        const b = new SurveyBuilder();
        b.options(survey.options);
        const pageBuilder = b
            .page("Workflow parameters")
            .translate("fr", "Paramètres du workflow");
        this.page = pageBuilder.build([]);
        survey.insertPage(pageSetIndex, 0, this.page);
        this.pageIndex = 0;
        this.surveyPageIndex = survey.pages.indexOf(this.page);
        survey.insertItems(this.surveyPageIndex, 0, [...(_a = this.parts) === null || _a === void 0 ? void 0 : _a.items], [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.crossRules]);
        participant.updatePageSets(survey.pageSets);
    }
    apply(survey) {
        survey.deleteWorkflow(this.workflowIndex);
    }
    canApply() {
        return true;
    }
}

function libOrderItem(b, name, section) {
    const builder = b.page(name);
    if (section)
        builder.startSection(section);
    builder
        .question("", "__ITEM_DIRECTION__", b.types.choice("one", "up", "down").translate("fr", "haut", "bas"))
        .translate("en", "Direction")
        .translate("fr", "Direction")
        .required()
        .comment("{.studio.studioApply}");
    if (section)
        builder.endSection();
    return builder;
}

class OrderItemCommand {
    buildParts(section) {
        const builder = new SurveyBuilder();
        libOrderItem(builder, "orderItem", section);
        libApply(builder, "apply", section);
        this.parts = builder.get();
    }
    get directionPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__ITEM_DIRECTION__");
    }
    get applyPart() {
        var _a;
        return (_a = this.parts) === null || _a === void 0 ? void 0 : _a.items.find(i => i.variableName == "__APPLY__");
    }
    start(survey, participant, pageIndex, index) {
        var _a, _b, _c;
        this.pageIndex = pageIndex;
        this.pageItemIndex = index;
        this.page = survey.pages[pageIndex];
        this.pageItem = getItem(this.page.items[index]);
        this.crossRules = [
            ...survey.crossRules.filter(rule => rule.pageItems.some(pi => getScopedItem(pi) == this.pageItem)),
        ];
        this.buildParts((_a = this.pageItem) === null || _a === void 0 ? void 0 : _a.section);
        survey.insertItems(pageIndex, index + 1, [...(_b = this.parts) === null || _b === void 0 ? void 0 : _b.items], [...(_c = this.parts) === null || _c === void 0 ? void 0 : _c.crossRules]);
        participant.updatePageSets(survey.pageSets);
        participant.insertItems(this.getPartItems());
    }
    getPartItems() {
        return DomainCollection(new InterviewItem(this.directionPart, undefined), new InterviewItem(this.applyPart, undefined));
    }
    apply(survey, participant, items) {
        var _a, _b, _c;
        const direction = items.find(i => i.pageItem == this.directionPart);
        const shift = direction.value == "up" ? -1 : 1;
        const includeIndex = survey.pages.findIndex(p => p.includes.includes(this.pageItem));
        const pageItemIndex = survey.pages[includeIndex].includes.indexOf(this.pageItem);
        const toIndex = pageItemIndex + shift;
        const isFirstOrLast = this.firstOrLast(survey, includeIndex, toIndex);
        const toSection = (_a = survey.pages[includeIndex].includes[toIndex]) === null || _a === void 0 ? void 0 : _a.section;
        if (!isFirstOrLast && ((_b = this.pageItem) === null || _b === void 0 ? void 0 : _b.section) == toSection)
            this.moveInSection(survey, includeIndex, pageItemIndex, toIndex);
        else
            this.changeSection(survey, toSection);
        participant.updatePageSets(survey.pageSets);
        this.pageItemIndex = ((_c = this.pageItemIndex) !== null && _c !== void 0 ? _c : 0) + shift;
    }
    firstOrLast(survey, includeIndex, newIndex) {
        const firstItemInInclude = newIndex == -1;
        const lastItemInInclude = survey.pages[includeIndex].items.length == newIndex;
        return firstItemInInclude || lastItemInInclude;
    }
    moveInSection(survey, includeIndex, fromIndex, toIndex) {
        survey.deleteInclude(includeIndex, fromIndex);
        survey.insertInclude(includeIndex, toIndex, this.pageItem);
    }
    changeSection(survey, toSection) {
        var _a;
        const newItem = (_a = this.pageItem) === null || _a === void 0 ? void 0 : _a.update({ section: toSection });
        survey.updateItem(this.pageIndex, this.pageItemIndex, newItem, []);
    }
    canApply(survey, items) {
        const directionPart = items.find(i => i.pageItem.variableName == "__ITEM_DIRECTION__");
        return (typeof directionPart != "undefined" &&
            (directionPart.value == "up" || directionPart.value == "down"));
    }
}

class SurveyState {
    constructor(value) {
        this.value = value;
        return DomainProxy(this, value);
    }
    update(kwargs) {
        this.value = this.value.update(kwargs);
        return this;
    }
}
class ParticipantState {
    constructor(survey, value) {
        this.survey = survey;
        this.value = value;
        this.nullCommand = new NullCommand();
        this.pending = this.nullContext();
        return DomainProxy(this, value);
    }
    nullContext() {
        const nullFn = () => { };
        return {
            survey: this.survey.value,
            participant: this.participant.value,
            command: this.nullCommand,
            resolve: nullFn,
            reject: nullFn,
        };
    }
    get interview() {
        return this.getInterview(this.pending);
    }
    get pageSet() {
        return this.getPageSet(this.pending);
    }
    get page() {
        return this.getPage(this.pending);
    }
    get pageItem() {
        return this.getPageItem(this.pending);
    }
    get participant() {
        return this;
    }
    get isIdle() {
        return this.pending.command == this.nullCommand;
    }
    get isPending() {
        return this.pending.command != this.nullCommand;
    }
    getState(interview) {
        if (this.isIdle)
            this.interviewIndex = this.participant.interviews.indexOf(interview);
        return this;
    }
    start(cmd, ...args) {
        if (this.isPending)
            throw "Command is already started";
        const started = new Promise((resolve, reject) => {
            this.pending = {
                command: new cmd(),
                survey: this.survey.value,
                participant: this.participant.value,
                resolve: resolve,
                reject: reject,
            };
        });
        const { mutableSurvey, mutableParticipant } = this.startContext(args);
        this.survey.update(mutableSurvey.value);
        this.participant.update(mutableParticipant.value);
        return started;
    }
    startContext(args) {
        const mutableSurvey = new MutableSurvey(this.pending.survey);
        const mutableParticipant = new MutableParticipant(this.pending.participant);
        this.pending.command.start(mutableSurvey, mutableParticipant, ...args);
        return { mutableSurvey, mutableParticipant };
    }
    canApply(items) {
        return (typeof this.pending != "undefined" &&
            this.pending.command.canApply(this.pending.survey, items));
    }
    apply(items) {
        var _a;
        try {
            const { mutableSurvey, mutableParticipant } = this.applyContext(items);
            this.survey.update(mutableSurvey.value);
            this.participant.update(mutableParticipant.value);
            const targets = this.getTargets(this.pending);
            const results = Object.assign({ result: "applied" }, targets);
            this.pending.resolve(results);
            this.pending = this.nullContext();
            return results;
        }
        catch (e) {
            (_a = this.pending) === null || _a === void 0 ? void 0 : _a.reject(String(e));
            throw e;
        }
    }
    applyContext(items) {
        const mutableSurvey = new MutableSurvey(this.pending.survey);
        const mutableParticipant = new MutableParticipant(this.pending.participant);
        this.pending.command.apply(mutableSurvey, mutableParticipant, items);
        return { mutableSurvey, mutableParticipant };
    }
    getTargets(context) {
        const interview = this.getInterview(context);
        const pageSet = this.getPageSet(context);
        const page = this.getPage(context);
        const pageItem = this.getPageItem(context);
        return { interview, pageSet, page, pageItem };
    }
    getInterview({ command: { pageSetIndex } }) {
        if (pageSetIndex == -1 ||
            (typeof pageSetIndex == "number" &&
                pageSetIndex >= this.survey.pageSets.length))
            return this.participant.interviews[0];
        const pageSet = typeof pageSetIndex == "number" &&
            pageSetIndex < this.survey.pageSets.length
            ? this.survey.pageSets[pageSetIndex]
            : undefined;
        const interview = typeof this.interviewIndex == "number" &&
            this.interviewIndex < this.participant.interviews.length
            ? this.participant.interviews[this.interviewIndex]
            : undefined;
        const hasPageSet = interview && (!pageSet || interview.pageSet == pageSet);
        if (hasPageSet)
            return interview;
        this.interviewIndex = this.participant.interviews.findIndex(i => i.pageSet == pageSet);
        return this.participant.interviews[this.interviewIndex];
    }
    getPageSet(context) {
        var _a;
        return (_a = this.getInterview(context)) === null || _a === void 0 ? void 0 : _a.pageSet;
    }
    getPage(context) {
        var _a;
        const { command: { pageSetIndex, pageIndex }, } = context;
        if (pageIndex == -1 ||
            (typeof pageSetIndex == "number" &&
                pageSetIndex >= this.survey.pageSets.length) ||
            (typeof pageSetIndex == "number" &&
                typeof pageIndex == "number" &&
                pageIndex >= this.survey.pageSets[pageSetIndex].pages.length))
            return (_a = this.getPageSet(context)) === null || _a === void 0 ? void 0 : _a.pages[0];
        return typeof pageSetIndex == "number" && typeof pageIndex == "number"
            ? this.survey.pageSets[pageSetIndex].pages[pageIndex]
            : typeof pageIndex == "number" && pageIndex < this.survey.pages.length
                ? this.survey.pages[pageIndex]
                : undefined;
    }
    getPageItem({ command: { pageIndex, pageItemIndex }, }) {
        if (pageItemIndex == -1 ||
            (typeof pageItemIndex == "number" &&
                pageItemIndex >= this.survey.pages[pageIndex].items.length))
            return undefined;
        return typeof pageIndex == "number" && typeof pageItemIndex == "number"
            ? getItem(this.survey.pages[pageIndex].items[pageItemIndex])
            : undefined;
    }
    cancel() {
        var _a;
        if (this.isIdle)
            throw "Command is not started";
        try {
            this.survey.update(this.pending.survey);
            this.participant.update(this.pending.participant);
            const targets = this.getTargets(this.pending);
            const results = Object.assign({ result: "canceled" }, targets);
            this.pending.resolve(results);
            this.pending = this.nullContext();
            return results;
        }
        catch (e) {
            (_a = this.pending) === null || _a === void 0 ? void 0 : _a.reject(String(e));
            throw e;
        }
    }
    update(kwargs) {
        this.value = this.value.update(kwargs);
        return this;
    }
    init(keys) {
        if (typeof this.interviewIndex == "undefined")
            throw "call getState() before";
        this.value = this.initUpdate(this.value, keys);
        if (typeof this.pending != "undefined")
            this.pending.participant = this.initUpdate(this.pending.participant, keys);
        return this.value.interviews[this.interviewIndex];
    }
    initUpdate(participant, keys) {
        return participant.update({
            interviews: participant.interviews.map((i, x) => x == this.interviewIndex ? i.update(keys) : i),
        });
    }
}

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

class InterviewStudioDriver {
    constructor(driver, surveyDriver) {
        this.driver = driver;
        this.surveyDriver = surveyDriver;
    }
    save(survey, participant, interview, items = interview.items) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isDomainProxy(survey) && isDomainProxy(participant)) {
                const state = participant;
                return this.tryApplyState(state, survey, participant, items);
            }
            throw "domain object is not a proxy";
        });
    }
    tryApplyState(state, survey, participant, items) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.canApply(state, [...items])) {
                const results = state.apply([...items]);
                return this.saveSurvey(state, survey, participant, results.interview);
            }
            return [{}, { items: [] }];
        });
    }
    canApply(state, items) {
        const applyItem = getApplyItem(items);
        return (typeof applyItem != "undefined" &&
            applyItem.value == true &&
            state.canApply([...items]));
    }
    saveSurvey(state, survey, participant, interview) {
        return __awaiter(this, void 0, void 0, function* () {
            const pending = this.surveyDriver.save(survey);
            if (interview.nonce == 0) {
                yield pending;
                return this.saveInterview(state, survey, participant, interview);
            }
            return [interview, { items: [] }];
        });
    }
    saveInterview(state, survey, participant, interview) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = yield this.driver.save(survey, participant, interview);
            const nonced = state.init(keys);
            return [nonced, { items: [] }];
        });
    }
    delete() {
        throw new Error("Delete not supported by studio drivers.");
    }
}

class ParticipantStudioDriver {
    constructor(driver) {
        this.driver = driver;
    }
    getAll(survey, samples) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.driver.getAll(survey, samples, { limit: 15 });
        });
    }
    getByParticipantCode(survey, samples, participantCode) {
        return __awaiter(this, void 0, void 0, function* () {
            const participant = yield this.driver.getByParticipantCode(survey, samples, participantCode);
            if (isDomainProxy(survey)) {
                const adapter = new ParticipantState(survey, participant);
                return adapter;
            }
            throw "domain object is not a proxy";
        });
    }
    getBySample(survey, sample) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.driver.getBySample(survey, sample, { limit: 15 });
        });
    }
    save(survey, participant) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isDomainProxy(survey) && isDomainProxy(participant))
                return yield this.driver.save(survey.value, participant.value);
            throw "domain object is not a proxy";
        });
    }
    delete() {
        throw new Error("Delete not supported by studio drivers.");
    }
}

class SurveyStudioDriver {
    constructor(driver) {
        this.driver = driver;
    }
    getByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const survey = yield this.driver.getByName(name);
            return new SurveyState(survey);
        });
    }
    save(survey) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isDomainProxy(survey))
                return yield this.driver.save(survey.value);
            throw "domain object is not a proxy";
        });
    }
}

class StudioDrivers {
    constructor(drivers) {
        const surveyDriver = new SurveyStudioDriver(drivers.surveyDriver);
        this.surveyDriver = surveyDriver;
        this.sampleDriver = drivers.sampleDriver;
        this.participantDriver = new ParticipantStudioDriver(drivers.participantDriver);
        this.interviewDriver = new InterviewStudioDriver(drivers.interviewDriver, surveyDriver);
        this.summaryDriver = new SummaryGenericDriver(this.participantDriver, this.sampleDriver);
        this.userDriver = drivers.userDriver;
        this.auditDriver = drivers.auditDriver;
        this.documentDriver = drivers.documentDriver;
        this.kpiDriver = drivers.kpiDriver;
        this.client = drivers.client;
    }
}

class SurveyTemplate {
    constructor(name) {
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
            .question("Is this participant included", "__INCLUDED", b.types.acknowledge)
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

class ParticipantTemplate {
    constructor(survey, sample) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const participantBuilder = new ParticipantBuilder(survey, "", sample);
        participantBuilder.interview(survey.mainWorkflow.info);
        participantBuilder
            .interview(survey.mainWorkflow.start)
            .item(new InterviewItem(survey.items[0], true))
            .item(new InterviewItem(survey.items[1], today));
        return participantBuilder.build();
    }
}

class UnfoldLayout extends Array {
    constructor(layout, pageItem) {
        super();
        super.push(...layout.map(l => ({
            title: l.title,
            content: new UnfoldSection(l.content, pageItem),
        })));
    }
}
class UnfoldSection extends Array {
    constructor(sectionContent, pageItem) {
        super();
        const section = sectionContent.reduce((acc, i) => {
            switch (i.behavior) {
                case "item":
                    acc.push(i);
                    break;
                case "table":
                    acc.push(...new UnfoldTable(i, pageItem));
                    break;
                case "richItem":
                    acc.push(i);
                    break;
                case "recordset":
                    acc.push(i);
                    break;
            }
            return acc;
        }, []);
        this.push(...section);
    }
}
class UnfoldTable extends Array {
    constructor(table, pageItem) {
        super();
        const rowIndex = table.items.findIndex(i => i.row.find(r => getItem(r === null || r === void 0 ? void 0 : r.item).variableName ==
            getItem(pageItem).variableName));
        if (rowIndex != -1)
            this.push(...new RowWrapper(table, rowIndex));
        else
            this.push(table);
    }
}
class UnfoldRow extends Array {
    constructor(table, rowIndex) {
        super();
        if (rowIndex != 0)
            super.push(this.getBeforeRowIndex(table, rowIndex));
        super.push(...this.getExtandedRow(table, rowIndex));
        if (rowIndex != table.items.length - 1)
            super.push(this.getAfterRowIndex(table, rowIndex));
    }
    getAfterRowIndex(table, rowIndex) {
        return {
            behavior: "table",
            columns: table.columns,
            items: table.items.slice(rowIndex + 1),
        };
    }
    getExtandedRow(table, rowIndex) {
        return table.items[rowIndex].row.map(cell => {
            var _a;
            const pageItem = cell ? getItem(cell === null || cell === void 0 ? void 0 : cell.item) : undefined;
            return {
                behavior: "item",
                labels: {
                    comment: pageItem === null || pageItem === void 0 ? void 0 : pageItem.comment,
                    wording: pageItem === null || pageItem === void 0 ? void 0 : pageItem.wording,
                },
                modifiers: { classes: (_a = cell === null || cell === void 0 ? void 0 : cell.modifiers.classes) !== null && _a !== void 0 ? _a : [] },
                item: cell === null || cell === void 0 ? void 0 : cell.item,
            };
        });
    }
    getBeforeRowIndex(table, rowIndex) {
        return {
            behavior: "table",
            columns: table.columns,
            items: table.items.slice(0, rowIndex),
        };
    }
}
const RowWrapper = UnfoldRow;

export { DeleteItemCommand, DeletePageCommand, DeletePageSetCommand, DeleteWorkflowCommand, InsertItemCommand, InsertPageCommand, InsertPageSetCommand, InsertTableLineCommand, InsertWorkflowCommand, NullCommand, OrderItemCommand, ParticipantState, ParticipantTemplate, StudioDrivers, SurveyState, SurveyTemplate, UnfoldLayout, UniquePageItemRule, UniquePageRule, UniquePageSetRule, UniqueWorkflowRule, UpdateItemCommand, UpdatePageCommand, UpdatePageSetCommand, UpdateSurveyOptionsCommand, UpdateWorkflowCommand, allInRangeSet, allRequiredSet, allUniqueSet, getApplyItem, parseRangeValue };
