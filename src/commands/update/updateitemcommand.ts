/* eslint-disable prettier/prettier */
import {
  MutableSurvey,
  IDomainCollection,
  InterviewItem,
  Survey,
  SurveyBuilder,
  PageItem,
  DomainCollection,
  ItemTypes,
  TypeName,
  getItem,
  mlstring,
  ScoreType,
  ChoiceType,
  Metadata,
  PageItemBuilder,
  CrossItemRule,
  ItemType,
  hasPivot,
  Computed,
  MutableParticipant,
  ContextType,
} from "uask-dom";
import { allLanguagesSet, allRequiredSet, IMutationCommand } from "../command.js";
import { libApply } from "../libapply.js";
import { AllLanguagesSetRule } from "../rules.js";
import { libUpdateItem } from "./libupdateitem.js";

export type ChoiceList = { name: string; label: mlstring }[];
export type ScoreList = { score: number; label: mlstring }[];

export class UpdateItemCommand implements IMutationCommand {
  pageIndex?: number;
  pageItemIndex?: number;
  parts?: Survey;
  private pageItem?: PageItem;
  private metadata?: Metadata;
  private hasContext?: boolean;

  //#region parts
  private buildParts(survey: Survey, section: mlstring | undefined, context: boolean) {
    const builder = new SurveyBuilder();
    libUpdateItem(builder, "updateItem", { section, context });
    libApply(builder, "apply", section);
    this.parts = builder.get();
    this.parts = this.parts.update({
      crossRules: this.parts?.crossRules.append(
        new CrossItemRule(this.wordingPart, new AllLanguagesSetRule(survey.options))
      )
    })
  }

  get itemParts(): IDomainCollection<PageItem> | undefined {
    return this.parts?.items;
  }

  get wordingPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_WORDING__"
    ) as PageItem;
  }

  get typePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_TYPE__"
    ) as PageItem;
  }

  get applyPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__APPLY__"
    ) as PageItem;
  }

  get argDatePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_TYPE_ARG_DATE__"
    ) as PageItem;
  }

  get argMinScalePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_TYPE_ARG_SCALE_MIN__"
    ) as PageItem;
  }

  get argMaxScalePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_TYPE_ARG_SCALE_MAX__"
    ) as PageItem;
  }

  get argScorePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_TYPE_ARG_SCORE__"
    ) as PageItem;
  }

  get argMultiplicityChoicePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_TYPE_ARG_CHOICE_MULTIPLICITY__"
    ) as PageItem;
  }

  get argChoicesPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_TYPE_ARG_CHOICE_LIST__"
    ) as PageItem;
  }

  get contextPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_CONTEXT__"
    ) as PageItem;
  }

  get requiredRulePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_REQUIRED__"
    ) as PageItem;
  }

  get letterCaseRulePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_LETTERCASE__"
    ) as PageItem;
  }

  get letterCaseRuleArgPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_ARG_LETTERCASE__"
    ) as PageItem;
  }

  get inRangePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_INRANGE__"
    ) as PageItem;
  }

  get inRangeMinArgPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_ARG_INRANGE_MIN__"
    ) as PageItem;
  }

  get inRangeMaxArgPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_ARG_INRANGE_MAX__"
    ) as PageItem;
  }

  get inRangeLimitsArgPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_ARG_INRANGE_LIMITS__"
    ) as PageItem;
  }

  get textLengthPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_TEXTLENGTH__"
    ) as PageItem;
  }

  get textLengthArgPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_ARG_TEXTLENGTH__"
    ) as PageItem;
  }

  get textLengthArgPrecisionPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_ARG_TEXTLENGTH_PREC__"
    ) as PageItem;
  }

  get decimalPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_DECIMALPRECISION__"
    ) as PageItem;
  }

  get decimalArgPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_ARG_DECPRECISION__"
    ) as PageItem;
  }

  get isComputedPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_ISCOMPUTED__"
    ) as PageItem;
  }

  get computedFormulaPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_COMPUTED_FORMULA__"
    ) as PageItem;
  }

  get hasDefaultPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_HASDEFAULT__"
    ) as PageItem;
  }

  get defaultTypePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_DEFAULT_TYPE__"
    ) as PageItem;
  }

  get defaultPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_DEFAULT__"
    ) as PageItem;
  }

  get isActivablePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_ACTIVATION__"
    ) as PageItem;
  }

  get activationConditionTypePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_ACTIVATION_TYPE__"
    ) as PageItem;
  }

  get activationConditionArgPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_ACTIVATION_ARG__"
    ) as PageItem;
  }

  get isCriticalPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_CRITICAL__"
    ) as PageItem;
  }

  get criticalEventPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_CRITICAL_EVENT__"
    ) as PageItem;
  }

  get criticalTriggerPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_CRITICAL_TRIGGER__"
    ) as PageItem;
  }

  get criticalMessagePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_RULE_CRITICAL_MESSAGE__"
    ) as PageItem;
  }

  get isPinnedPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_PIN__"
    ) as PageItem;
  }

  get pinTitlePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "ITEM_PIN_ARG__"
    ) as PageItem;
  }

  get isKpiPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_KPI__"
    ) as PageItem;
  }

  get kpiTitlePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_KPI_ARG__"
    ) as PageItem;
  }

  get unitPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_UNIT__"
    ) as PageItem;
  }

  get argUnitPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_UNIT_ARG__"
    ) as PageItem;
  }

  get extendableUnitPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_UNIT_ARG_EXTENDABLE__"
    ) as PageItem;
  }

  get argDurationTimePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_TYPE_ARG_TIME_DURATION__"
    ) as PageItem;
  }

  get commentPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_COMMENT__"
    ) as PageItem;
  }

  get argCommentPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_COMMENT_ARG__"
    ) as PageItem;
  }

  get sectionCurrentPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_CURRENT_SECTION__"
    ) as PageItem;
  }

  get sectionAckChangePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_ACK_CHANGE_SECTION__"
    ) as PageItem;
  }

  get sectionArgPart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_SECTION_ARG__"
    ) as PageItem;
  }

  get sectionNamePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__ITEM_SECTION_NAME__"
    ) as PageItem;
  }

  //#endregion

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    pageIndex: number,
    index: number
  ): void {
    this.pageIndex = pageIndex;
    this.pageItem = getItem(survey.value.pages[pageIndex].items[index]);
    this.pageItemIndex = index;
    this.metadata = new Metadata(this.pageItem, survey.rules);

    this.hasContext =
      Array.isArray(this.pageItem.wording) ||
      this.pageItem instanceof ContextType;
    this.buildParts(survey, this.pageItem.section, this.hasContext);

    survey.insertItems(
      pageIndex,
      index + 1,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );

    participant.updatePageSets(survey.pageSets);
    participant.insertItems(this.getPartItems());
  }

  private getPartItems(): IDomainCollection<InterviewItem> {
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

    const isRequired = this.metadata?.required;
    const isComputed = !!this.metadata?.computed;
    const formula = this.metadata?.computed;
    const hasDefault = !!this.metadata?.default;
    const defaultValue = this.metadata?.default;
    const defaultType = this.metadata?.defaultType;

    const letterCase = this.metadata?.letterCase != undefined;
    const letterCaseName =
      this.metadata?.letterCase == "lower"
        ? "L"
        : this.metadata?.letterCase == "upper"
        ? "U"
        : undefined;

    const isInRange =
      this.metadata?.min instanceof Date
        ? this.metadata?.min?.toLocaleDateString("sv")
        : (this.metadata?.min as number)?.toString();
    const inRangeMax =
      this.metadata?.max instanceof Date
        ? this.metadata?.max?.toLocaleDateString("sv")
        : (this.metadata?.max as number)?.toString();
    const limits = this.getLimits();

    const hasTextLength =
      !!this.metadata?.fixedLength || !!this.metadata?.maxLength;
    const textLength = this.metadata?.fixedLength ?? this.metadata?.maxLength;
    const textLengthBehaviour = textLength
      ? this.metadata?.fixedLength
        ? "FL"
        : "ML"
      : undefined;

    const hasPrecision = !!this.metadata?.precision;
    const precision = this.metadata?.precision;

    const isActivable = !!this.metadata?.activable || !!this.metadata?.showable;
    const activableBehaviour = this.metadata?.activable
      ? "A"
      : this.metadata?.showable
      ? "V"
      : undefined;
    const activableCondition =
      this.metadata?.activable ?? this.metadata?.showable;

    const isCritical = !!this.metadata?.critical;
    const criticalEvent = (
      this.metadata?.critical as string | undefined
    )?.replace(/^'([^']*)'$/, "$1");
    const criticalMessage = this.metadata?.notification;
    const criticalTrigger = this.metadata?.trigger || undefined;

    const isPinned = !!this.pageItem?.pin;
    const pinTitle = this.pageItem?.pin;
    const isKpi = !!this.pageItem?.kpi;
    const kpiTitle = hasPivot(this.pageItem?.kpi)
      ? this.pageItem?.kpi.title
      : this.pageItem?.kpi;

    const hasUnits = (this.pageItem?.units?.values as string[]).length > 0;
    const units = hasUnits ? this.pageItem?.units?.values : undefined;
    const unitsExtendable = (this.pageItem?.units as { isExtendable: boolean })
      .isExtendable;

    const currentSection = this.pageItem?.section ?? {
      en: "None",
      fr: "Aucune",
    };
    const hasComment = !!this.pageItem?.comment;
    const comment = this.pageItem?.comment;

    return DomainCollection(
      ...this.partInstances(this.wordingPart, wording),
      ...this.partInstances(this.typePart, typeName),
      ...this.partInstances(this.argDatePart, dateFormat),
      ...this.partInstances(this.argDurationTimePart, timeFormat),
      ...this.partInstances(this.argMinScalePart, scaleMin),
      ...this.partInstances(this.argMaxScalePart, scaleMax),
      ...this.partInstances(this.argScorePart, scores),
      ...this.partInstances(this.argMultiplicityChoicePart, choiceMultiplicity),
      ...this.partInstances(this.argChoicesPart, choices),
      new InterviewItem(this.contextPart, hasContext),
      new InterviewItem(this.requiredRulePart, isRequired),
      new InterviewItem(this.letterCaseRulePart, letterCase),
      new InterviewItem(this.letterCaseRuleArgPart, letterCaseName),
      new InterviewItem(this.inRangePart, !!this.metadata?.range),
      new InterviewItem(this.inRangeMinArgPart, isInRange),
      new InterviewItem(this.inRangeMaxArgPart, inRangeMax),
      new InterviewItem(this.inRangeLimitsArgPart, limits),
      new InterviewItem(this.textLengthPart, hasTextLength),
      new InterviewItem(this.textLengthArgPart, textLengthBehaviour),
      new InterviewItem(this.textLengthArgPrecisionPart, textLength),
      new InterviewItem(this.decimalPart, hasPrecision),
      new InterviewItem(this.decimalArgPart, precision),
      new InterviewItem(this.isComputedPart, isComputed),
      new InterviewItem(this.computedFormulaPart, formula),
      new InterviewItem(this.hasDefaultPart, hasDefault),
      new InterviewItem(this.defaultTypePart, defaultType),
      new InterviewItem(this.defaultPart, defaultValue),
      new InterviewItem(this.isActivablePart, isActivable),
      new InterviewItem(this.activationConditionTypePart, activableBehaviour),
      new InterviewItem(this.activationConditionArgPart, activableCondition),
      new InterviewItem(this.isCriticalPart, isCritical),
      new InterviewItem(this.criticalEventPart, criticalEvent),
      new InterviewItem(this.criticalMessagePart, criticalMessage),
      new InterviewItem(this.criticalTriggerPart, criticalTrigger),
      new InterviewItem(this.isPinnedPart, isPinned),
      new InterviewItem(this.pinTitlePart, pinTitle),
      new InterviewItem(this.isKpiPart, isKpi),
      new InterviewItem(this.kpiTitlePart, kpiTitle),
      new InterviewItem(this.unitPart, hasUnits),
      new InterviewItem(this.argUnitPart, units),
      new InterviewItem(this.extendableUnitPart, unitsExtendable),
      new InterviewItem(this.applyPart, undefined),
      new InterviewItem(this.commentPart, hasComment),
      new InterviewItem(this.argCommentPart, comment),
      new InterviewItem(this.sectionCurrentPart, currentSection),
      new InterviewItem(this.sectionAckChangePart, undefined),
      new InterviewItem(this.sectionArgPart, undefined),
      new InterviewItem(this.sectionNamePart, undefined)
    );
  }

  private coerceContext(
    typeName: unknown[],
    wording: (mlstring | undefined)[]
  ) {
    while (typeName.length < wording.length) {
      typeName.push(...typeName.slice(0, wording.length - typeName.length));
    }
    while (wording.length < typeName.length) {
      wording.push(...wording.slice(0, typeName.length - wording.length));
    }
  }

  private getWording() {
    const wording = this.pageItem?.wording;
    return Array.isArray(wording) ? wording : [wording];
  }

  private getTypeProps(f: string | ((t: Record<string, unknown>) => unknown)) {
    const m = typeof f == "string" ? (t: Record<string, unknown>) => t[f] : f;
    const type = this.pageItem?.type as ItemType;
    if (type.name == "context")
      return Array.from(
        Object.values(type)
          .filter(v => v != "context")
          .map(t => m(t))
      );
    return [m(type as unknown as Record<string, unknown>)];
  }

  private partInstances(part: PageItem, values: unknown[]) {
    const instances: InterviewItem[] = [];
    let p: PageItem | undefined;
    for (const value of values) {
      p = p ? p.nextInstance() : part;
      instances.push(new InterviewItem(p, value));
    }
    return instances;
  }

  apply(
    survey: MutableSurvey,
    participant: MutableParticipant,
    interviewItems: InterviewItem[]
  ): void {
    const { updatedItem, updatedRules } = this.bindPartItems(
      survey.value,
      interviewItems
    );
    survey.updateItem(
      this.pageIndex as number,
      this.pageItemIndex as number,
      updatedItem,
      updatedRules
    );

    participant.updatePageSets(survey.pageSets);
    participant.updateItem(updatedItem);
  }

  bindPartItems(
    survey: Survey,
    interviewItems: InterviewItem[]
  ): { updatedItem: PageItem; updatedRules: CrossItemRule[] } {
    const { pageItemBuilder, surveyBuilder } = this.getBuilders(
      interviewItems,
      survey
    );

    this.bindPinsAndKpis(interviewItems, pageItemBuilder);
    this.bindUnits(interviewItems, pageItemBuilder);
    this.bindComments(interviewItems, pageItemBuilder);
    this.bindRules(interviewItems, pageItemBuilder);

    const updatedItem = pageItemBuilder.build([...survey.items]);
    const updatedRules = surveyBuilder.crossRules.map(b =>
      b.build([updatedItem, ...survey.items])
    );

    return { updatedItem, updatedRules };
  }

  private getBuilders(interviewItems: InterviewItem[], survey: Survey) {
    const { wording, variableName, type } = this.bindItem(interviewItems);
    const section = this.bindSection(interviewItems);

    const surveyBuilder = new SurveyBuilder();
    surveyBuilder.options(survey.options);

    const pageItemBuilder = surveyBuilder.question(
      wording as string,
      variableName,
      type,
      section as string | undefined
    );

    return { pageItemBuilder, surveyBuilder };
  }

  private bindItem(interviewItems: InterviewItem[]) {
    const variableName = this.pageItem?.variableName as string;
    const wording = this.bindWording(interviewItems);
    const type = this.bindType(interviewItems);
    const hasContext = !!interviewItems.find(
      i => i.pageItem == this.contextPart
    )?.value;
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

  private bindWording(interviewItems: InterviewItem[]) {
    const wordings = interviewItems
      .filter(i => i.pageItem.isInstanceOf(this.wordingPart))
      .sort((a, b) => a.pageItem.instance - b.pageItem.instance)
      .map(i => i.value) as string[];
    return wordings.length == 1 ? wordings[0] : wordings;
  }

  private bindSection(interviewItems: InterviewItem[]) {
    const newSectionName = interviewItems.find(
      i => i.pageItem == this.sectionNamePart
    )?.value as mlstring | undefined;

    const sectionChangeAck = interviewItems.find(
      i => i.pageItem == this.sectionAckChangePart
    )?.value;

    const sectionArg = interviewItems.find(
      i => i.pageItem == this.sectionArgPart
    )?.value;

    const section = sectionChangeAck
      ? sectionArg == "NONE"
        ? undefined
        : newSectionName
      : this.pageItem?.section;
    return section;
  }

  private bindPinsAndKpis(
    interviewItems: InterviewItem[],
    pageItemBuilder: PageItemBuilder
  ) {
    const isPinnedItem = interviewItems.find(
      i => i.pageItem == this.isPinnedPart
    )?.value;
    if (isPinnedItem) {
      const pinTitle = interviewItems.find(i => i.pageItem == this.pinTitlePart)
        ?.value as string;
      pageItemBuilder.pin(pinTitle);
    }

    const isKpiedItem = interviewItems.find(
      i => i.pageItem == this.isKpiPart
    )?.value;
    if (isKpiedItem) {
      const kpiTitle = interviewItems.find(i => i.pageItem == this.kpiTitlePart)
        ?.value as string;
      const kpiPivot = hasPivot(this.pageItem?.kpi)
        ? this.pageItem?.kpi.pivot.variableName
        : undefined;
      pageItemBuilder.kpi(kpiTitle, kpiPivot);
    }
  }

  private bindUnits(
    interviewItems: InterviewItem[],
    pageItemBuilder: PageItemBuilder
  ) {
    const units = interviewItems.find(i => i.pageItem == this.unitPart)?.value;
    if (units) {
      const unitList = interviewItems.find(i => i.pageItem == this.argUnitPart)
        ?.value as string[];
      pageItemBuilder.unit(...unitList);
      const unitExtendable = interviewItems.find(
        i => i.pageItem == this.extendableUnitPart
      )?.value as string;
      if (unitExtendable) pageItemBuilder.extendable();
    }
  }

  private bindComments(
    interviewItems: InterviewItem[],
    pageItemBuilder: PageItemBuilder
  ) {
    const comment = interviewItems.find(
      i => i.pageItem == this.commentPart
    )?.value;
    if (comment) {
      const commentString = interviewItems.find(
        i => i.pageItem == this.argCommentPart
      )?.value as mlstring;
      pageItemBuilder.comment(commentString);
    }
  }

  private getLimits(): string[] {
    const value: string[] = [];
    const limits = this.metadata?.limits as {
      includeLower: boolean;
      includeUpper: boolean;
    };
    if (limits?.includeLower) value.push("L");
    if (limits?.includeUpper) value.push("U");
    return value;
  }

  private bindRules(
    interviewItems: InterviewItem[],
    pageItemBuilder: PageItemBuilder
  ): void {
    const required = interviewItems.find(
      i => i.pageItem == this.requiredRulePart
    )?.value;
    if (required) pageItemBuilder.required();

    const letterCased = interviewItems.find(
      i => i.pageItem == this.letterCaseRulePart
    )?.value
      ? interviewItems.find(i => i.pageItem == this.letterCaseRuleArgPart)
          ?.value == "L"
        ? "lower"
        : interviewItems.find(i => i.pageItem == this.letterCaseRuleArgPart)
            ?.value == "U"
        ? "upper"
        : undefined
      : undefined;
    if (letterCased)
      pageItemBuilder.letterCase(letterCased as "upper" | "lower");

    const inRange = interviewItems.find(
      i => i.pageItem == this.inRangePart
    )?.value;
    const inRangeMin = parseRangeValue(
      interviewItems.find(i => i.pageItem == this.inRangeMinArgPart)
        ?.value as string
    );
    const inRangeMax = parseRangeValue(
      interviewItems.find(i => i.pageItem == this.inRangeMaxArgPart)
        ?.value as string
    );
    const limitPart = interviewItems.find(
      i => i.pageItem == this.inRangeLimitsArgPart
    )?.value as string[];
    const inRangeLimits = {
      includeLower: limitPart?.includes("L"),
      includeUpper: limitPart?.includes("U"),
    };
    if (inRange) pageItemBuilder.inRange(inRangeMin, inRangeMax, inRangeLimits);

    const textlength = interviewItems.find(
      i => i.pageItem == this.textLengthPart
    )?.value;
    const textlengthArg = interviewItems.find(
      i => i.pageItem == this.textLengthArgPart
    )?.value;
    const textlengthArgPrecision = interviewItems.find(
      i => i.pageItem == this.textLengthArgPrecisionPart
    )?.value as number;
    if (textlength)
      textlengthArg == "FL"
        ? pageItemBuilder.fixedLength(textlengthArgPrecision)
        : pageItemBuilder.maxLength(textlengthArgPrecision);

    const decimal = interviewItems.find(
      i => i.pageItem == this.decimalPart
    )?.value;
    const decimalArg = interviewItems.find(
      i => i.pageItem == this.decimalArgPart
    )?.value as number;
    if (decimal) pageItemBuilder.decimalPrecision(decimalArg);

    const isComputed = interviewItems.find(
      i => i.pageItem == this.isComputedPart
    )?.value;
    if (isComputed) {
      const computedFormula = interviewItems.find(
        i => i.pageItem == this.computedFormulaPart
      )?.value as string;
      pageItemBuilder.computed(computedFormula);
    }

    const hasDefault = interviewItems.some(
      i => i.pageItem == this.hasDefaultPart && i.value
    );
    if (hasDefault) {
      const defaultType = interviewItems.find(
        i => i.pageItem == this.defaultTypePart
      )?.value as string;
      const defaultValue = interviewItems.find(
        i => i.pageItem == this.defaultPart
      )?.value;
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

    const activationRule = interviewItems.find(
      i => i.pageItem == this.isActivablePart
    )?.value;
    const activationRuleType = interviewItems.find(
      i => i.pageItem == this.activationConditionTypePart
    )?.value;
    const activationRuleCondition = interviewItems.find(
      i => i.pageItem == this.activationConditionArgPart
    )?.value as string;
    if (activationRule) {
      activationRuleType == "A"
        ? pageItemBuilder.activateWhen(activationRuleCondition)
        : pageItemBuilder.visibleWhen(activationRuleCondition);
    }

    const criticalRule = interviewItems.find(
      i => i.pageItem == this.isCriticalPart
    )?.value;
    const criticalRuleEvent = interviewItems.find(
      i => i.pageItem == this.criticalEventPart
    )?.value as string;
    const criticalRuleTrigger = interviewItems.find(
      i => i.pageItem == this.criticalTriggerPart
    )?.value as string | undefined;
    const criticalRuleMessage = interviewItems.find(
      i => i.pageItem == this.criticalMessagePart
    )?.value as string | undefined;
    if (criticalRule) {
      if (criticalRuleTrigger !== "" && criticalRuleTrigger !== undefined)
        pageItemBuilder.critical(criticalRuleEvent, criticalRuleMessage, {
          formula: criticalRuleTrigger,
        });
      else pageItemBuilder.critical(criticalRuleEvent, criticalRuleMessage);
    }
  }

  private bindType(interviewItems: InterviewItem[]) {
    const typeNames = interviewItems
      .filter(i => i.pageItem.isInstanceOf(this.typePart))
      ?.map(i => [i.value, i.pageItem.instance]) as [TypeName, number][];

    if (typeNames.length == 1)
      return this.bindTypeInstance(interviewItems, typeNames[0][0]);

    const types = typeNames
      .sort(([, i], [, j]) => i - j)
      .map(n => this.bindTypeInstance(interviewItems, ...n));
    return ItemTypes.context(types);
  }

  private bindTypeInstance(
    interviewItems: InterviewItem[],
    typeName: TypeName,
    instance = 1
  ) {
    const args: Record<string, unknown> = {};

    switch (typeName) {
      case "date":
        args.incomplete = interviewItems.find(i =>
          i.pageItem.isInstanceOf(this.argDatePart, instance)
        )?.value;
        break;
      case "scale":
        args.min = interviewItems.find(i =>
          i.pageItem.isInstanceOf(this.argMinScalePart, instance)
        )?.value;
        args.max = interviewItems.find(i =>
          i.pageItem.isInstanceOf(this.argMaxScalePart, instance)
        )?.value;
        break;
      case "score": {
        const scores = interviewItems.find(i =>
          i.pageItem.isInstanceOf(this.argScorePart, instance)
        )?.value as ScoreList;

        args.scores = scores.map(s => s.score);
        args.labels = scores.map(s => s.label);
        break;
      }
      case "choice": {
        const choices = interviewItems.find(i =>
          i.pageItem.isInstanceOf(this.argChoicesPart, instance)
        )?.value as ChoiceList;
        args.multiplicity =
          interviewItems.find(i =>
            i.pageItem.isInstanceOf(this.argMultiplicityChoicePart, instance)
          )?.value == true
            ? "many"
            : "one";
        args.choices = choices?.map(c => c.name);
        args.labels = choices?.map(c => c.label);
        break;
      }
      case "time":
        args.duration = !!interviewItems.find(i =>
          i.pageItem.isInstanceOf(this.argDurationTimePart, instance)
        )?.value;
        break;
    }
    return ItemTypes.create({ name: typeName, ...args });
  }

  canApply(survey: Survey, interviewItems: InterviewItem[]): boolean {
    const allParts = [...(this.parts?.items as IDomainCollection<PageItem>)];
    return allRequiredSet(allParts, interviewItems) && allLanguagesSet(allParts, interviewItems);
  }
}

export function parseRangeValue(rangeValue: string): number | Date | Computed {
  const num = Number(rangeValue);
  if (!isNaN(num)) return num;
  const date = new Date(rangeValue);
  if (!isNaN(date.getTime())) return date;
  return { formula: rangeValue };
}
