import { MutableSurvey, MutableParticipant, InterviewItem, Survey, PageItem, mlstring, IDomainCollection, CrossItemRule, Computed, Page, PageSet, Workflow, SurveyOptions, UnitRule, HasValue, CrossRule, IDomainProxy, Participant, Interview, Sample, LayoutSection, Item } from 'uask-dom';
import { PartialInterview, ClientDrivers, ISurveyDriver, ISampleDriver, IParticipantDriver, IParticipantDeleteDriver, IInterviewDriver, IInterviewDeleteDriver, ISummaryDriver, IUserDriver, IAuditDriver, IDocumentDriver, IKpiDriver } from 'uask-sys';
import { Got } from 'got/dist/source';

interface IMutationCommand<S extends unknown[] = unknown[]> {
    pageSetIndex?: number;
    pageIndex?: number;
    pageItemIndex?: number;
    start(survey: MutableSurvey, participant: MutableParticipant, ...args: S): void;
    apply(survey: MutableSurvey, participant: MutableParticipant, interviewItems: InterviewItem[]): void;
    canApply(survey: Survey, interviewItems: InterviewItem[]): boolean;
}
declare class NullCommand implements IMutationCommand {
    pageSetIndex: number;
    start(): void;
    apply(): void;
    canApply(): boolean;
}
declare function allRequiredSet(pageItems: PageItem[], interviewItems: InterviewItem[]): boolean;
declare function allUniqueSet(pageItems: PageItem[], interviewItems: InterviewItem[]): boolean;
declare function allInRangeSet(parts: PageItem[], interviewItems: InterviewItem[]): boolean;

declare type ChoiceList = {
    name: string;
    label: mlstring;
}[];
declare type ScoreList = {
    score: number;
    label: mlstring;
}[];
declare class UpdateItemCommand implements IMutationCommand {
    pageIndex?: number;
    pageItemIndex?: number;
    parts?: Survey;
    private pageItem?;
    private metadata?;
    private hasContext?;
    private buildParts;
    get itemParts(): IDomainCollection<PageItem> | undefined;
    get wordingPart(): PageItem;
    get typePart(): PageItem;
    get applyPart(): PageItem;
    get argDatePart(): PageItem;
    get argMinScalePart(): PageItem;
    get argMaxScalePart(): PageItem;
    get argScorePart(): PageItem;
    get argMultiplicityChoicePart(): PageItem;
    get argChoicesPart(): PageItem;
    get contextPart(): PageItem;
    get requiredRulePart(): PageItem;
    get letterCaseRulePart(): PageItem;
    get letterCaseRuleArgPart(): PageItem;
    get inRangePart(): PageItem;
    get inRangeMinArgPart(): PageItem;
    get inRangeMaxArgPart(): PageItem;
    get inRangeLimitsArgPart(): PageItem;
    get textLengthPart(): PageItem;
    get textLengthArgPart(): PageItem;
    get textLengthArgPrecisionPart(): PageItem;
    get decimalPart(): PageItem;
    get decimalArgPart(): PageItem;
    get isComputedPart(): PageItem;
    get computedFormulaPart(): PageItem;
    get hasDefaultPart(): PageItem;
    get defaultTypePart(): PageItem;
    get defaultPart(): PageItem;
    get isActivablePart(): PageItem;
    get activationConditionTypePart(): PageItem;
    get activationConditionArgPart(): PageItem;
    get isCriticalPart(): PageItem;
    get criticalEventPart(): PageItem;
    get criticalTriggerPart(): PageItem;
    get criticalMessagePart(): PageItem;
    get isPinnedPart(): PageItem;
    get pinTitlePart(): PageItem;
    get isKpiPart(): PageItem;
    get kpiTitlePart(): PageItem;
    get unitPart(): PageItem;
    get argUnitPart(): PageItem;
    get extendableUnitPart(): PageItem;
    get argDurationTimePart(): PageItem;
    get commentPart(): PageItem;
    get argCommentPart(): PageItem;
    get sectionCurrentPart(): PageItem;
    get sectionAckChangePart(): PageItem;
    get sectionArgPart(): PageItem;
    get sectionNamePart(): PageItem;
    start(survey: MutableSurvey, participant: MutableParticipant, pageIndex: number, index: number): void;
    private getPartItems;
    private coerceContext;
    private getWording;
    private getTypeProps;
    private partInstances;
    apply(survey: MutableSurvey, participant: MutableParticipant, interviewItems: InterviewItem[]): void;
    bindPartItems(survey: Survey, interviewItems: InterviewItem[]): {
        updatedItem: PageItem;
        updatedRules: CrossItemRule[];
    };
    private getBuilders;
    private bindItem;
    private bindWording;
    private bindSection;
    private bindPinsAndKpis;
    private bindUnits;
    private bindComments;
    private getLimits;
    private bindRules;
    private bindType;
    private bindTypeInstance;
    canApply(survey: Survey, interviewItems: InterviewItem[]): boolean;
}
declare function parseRangeValue(rangeValue: string): number | Date | Computed;

declare class UpdatePageCommand implements IMutationCommand {
    parts?: Survey;
    pageIndex?: number;
    private page?;
    private defaultLang?;
    private readonly includeCommand;
    constructor();
    private buildParts;
    get itemParts(): IDomainCollection<PageItem> | undefined;
    get namePart(): PageItem;
    start(survey: MutableSurvey, participant: MutableParticipant, index: number, section?: mlstring): void;
    private getPartItems;
    apply(survey: MutableSurvey, participant: MutableParticipant, interviewItems: InterviewItem[]): void;
    applyInclude(survey: MutableSurvey, participant: MutableParticipant, interviewItems: InterviewItem[]): void;
    bindPartItems(survey: Survey, interviewItems: InterviewItem[]): {
        updatedPage: Page;
    };
    canApply(survey: Survey, interviewItems: InterviewItem[]): boolean;
}

declare class UpdatePageSetCommand implements IMutationCommand {
    pageSetIndex?: number;
    pageIndex?: number;
    surveyPageIndex?: number;
    parts?: Survey;
    private pageSet?;
    private page?;
    private defaultLang?;
    private buildParts;
    get itemParts(): IDomainCollection<PageItem> | undefined;
    get applyPart(): PageItem;
    get typePart(): PageItem;
    get dateVarPart(): PageItem;
    get pagesPart(): PageItem;
    start(survey: MutableSurvey, participant: MutableParticipant, pageSetIndex: number, section?: mlstring): void;
    private buildParameterPage;
    private getPartItems;
    apply(survey: MutableSurvey, participant: MutableParticipant, interviewItems: InterviewItem[]): void;
    bindPartItems(survey: Survey, interviewItems: InterviewItem[]): {
        updatedPageSet: PageSet;
    };
    private getBuilder;
    private bindTypeNames;
    canApply(survey: Survey, interviewItems: InterviewItem[]): boolean;
}

declare class UpdateWorkflowCommand implements IMutationCommand {
    pageSetIndex?: number;
    pageIndex?: number;
    surveyPageIndex?: number;
    parts?: Survey;
    private workflowIndex?;
    private workflow?;
    private mainWorkflow?;
    private page?;
    private defaultLang?;
    get applyPart(): PageItem;
    get initialPart(): PageItem;
    get followupPart(): PageItem;
    get auxiliaryPart(): PageItem;
    get endPart(): PageItem;
    get withpagesetsPart(): PageItem;
    get notificationsPart(): PageItem;
    get isMain(): boolean;
    private buildParts;
    start(survey: MutableSurvey, participant: MutableParticipant, workflowIndex: number, pageSetIndex: number, section?: mlstring): void;
    private buildSettingsPage;
    private getPartItems;
    apply(survey: MutableSurvey, participant: MutableParticipant, interviewItems: InterviewItem[]): void;
    bindPartItems(survey: Survey, interviewItems: InterviewItem[]): {
        updatedWorkflow: Workflow;
    };
    canApply(survey: Survey, interviewItems: InterviewItem[]): boolean;
    private rebuildDerivedWorkflow;
}

declare class UpdateSurveyOptionsCommand implements IMutationCommand {
    pageSetIndex?: number;
    pageIndex?: number;
    parts?: Survey;
    surveyPageIndex?: number;
    private surveyOptions?;
    private page?;
    get applyPart(): PageItem;
    get eproPart(): PageItem;
    get fillratesPart(): PageItem;
    get availableLangsPart(): PageItem;
    get defaultLangPart(): PageItem;
    get participantCodeLengthPart(): PageItem;
    get participantCodeBySitePart(): PageItem;
    get interviewDatePart(): PageItem;
    get phonePart(): PageItem;
    get emailPart(): PageItem;
    get unitSuffixPart(): PageItem;
    get inclusionPart(): PageItem;
    private buildParts;
    start(survey: MutableSurvey, participant: MutableParticipant, pageSetIndex: number, section?: mlstring): void;
    private buildOptionPage;
    private getPartItems;
    apply(survey: MutableSurvey, participant: MutableParticipant, interviewItems: InterviewItem[]): void;
    bindPartItems(survey: Survey, interviewItems: InterviewItem[]): {
        updatedOptions: SurveyOptions;
    };
    private buidOptions;
    canApply(): boolean;
}

declare class UniquePageItemRule implements UnitRule {
    readonly survey: Survey;
    constructor(survey: Survey);
    execute(a: HasValue): HasValue;
    name: string;
    precedence: number;
}
declare class InsertItemCommand implements IMutationCommand {
    pageIndex?: number;
    pageItemIndex?: number;
    parts?: Survey;
    private item?;
    private readonly updateCommand;
    constructor();
    private buildParts;
    get variableNamePart(): PageItem;
    get isRecordPart(): PageItem;
    start(survey: MutableSurvey, participant: MutableParticipant, pageIndex: number, index: number, section?: string): void;
    private buildNewItem;
    private getPartItems;
    private getPartMessages;
    apply(survey: MutableSurvey, participant: MutableParticipant, interviewItems: InterviewItem[]): void;
    bindPartItems(survey: Survey, interviewItems: InterviewItem[]): {
        insertedItem: PageItem;
        insertedRules: CrossItemRule[];
    };
    toRecord(wording: mlstring | mlstring[]): mlstring | mlstring[];
    canApply(survey: Survey, interviewItems: InterviewItem[]): boolean;
}

declare class UniquePageRule implements UnitRule {
    readonly survey: Survey;
    readonly page: Page;
    readonly name = "unique";
    readonly precedence = 100;
    constructor(survey: Survey, page: Page);
    execute(a: HasValue): HasValue;
    private pageAlreadyExist;
}
declare class InsertPageCommand implements IMutationCommand {
    pageSetIndex?: number;
    pageIndex?: number;
    surveyPageIndex?: number;
    parts?: Survey;
    private readonly updateCommand;
    private page?;
    private indexNewPage?;
    private defaultLang?;
    constructor();
    private buildParts;
    get codePart(): PageItem;
    start(survey: MutableSurvey, participant: MutableParticipant, pageSetIndex: number, pageIndex: number): void;
    private buildNewPage;
    private getPartItems;
    private getPartMessages;
    apply(survey: MutableSurvey, participant: MutableParticipant, interviewItems: InterviewItem[]): void;
    private bindPartItems;
    canApply(survey: Survey, interviewItems: InterviewItem[]): boolean;
}

declare class UniquePageSetRule implements UnitRule {
    readonly survey: Survey;
    readonly pageSet: PageSet;
    constructor(survey: Survey, pageSet: PageSet);
    execute(a: HasValue): HasValue;
    private pageSetAlreadyExist;
    name: string;
    precedence: number;
}
declare class InsertPageSetCommand implements IMutationCommand {
    pageSetIndex?: number;
    pageIndex?: number;
    surveyPageIndex?: number;
    parts?: Survey;
    private readonly updateCommand;
    private pageSet?;
    private defaultLang?;
    constructor();
    get codePart(): PageItem;
    private buildParts;
    start(survey: MutableSurvey, participant: MutableParticipant, section?: mlstring): void;
    private buildNewPageSet;
    private getPartItems;
    private getPartMessages;
    apply(survey: MutableSurvey, participant: MutableParticipant, interviewItems: InterviewItem[]): void;
    private bindPartItems;
    canApply(survey: Survey, interviewItems: InterviewItem[]): boolean;
}

declare class UniqueWorkflowRule implements CrossRule {
    readonly survey: Survey;
    readonly workflow: Workflow;
    constructor(survey: Survey, workflow: Workflow);
    execute(names: HasValue, spec: HasValue): [HasValue, HasValue];
    workflowAlreadyExist(names: string[], spec: string): boolean;
    name: string;
    precedence: number;
}
declare class InsertWorkflowCommand implements IMutationCommand {
    pageSetIndex?: number;
    pageIndex?: number;
    surveyPageIndex?: number;
    readonly updateCommand: UpdateWorkflowCommand;
    private workflow?;
    private workflowIndex?;
    parts?: Survey;
    private buildParts;
    get namePart(): PageItem;
    get specifierPart(): PageItem;
    constructor();
    start(survey: MutableSurvey, participant: MutableParticipant, pageSetIndex: number): void;
    private getPartItems;
    private getPartMessages;
    private buildNewWorkflow;
    apply(survey: MutableSurvey, participant: MutableParticipant, interviewItems: InterviewItem[]): void;
    private bindPartItems;
    canApply(survey: Survey, interviewItems: InterviewItem[]): boolean;
}

declare class InsertTableLineCommand implements IMutationCommand {
    pageIndex?: number;
    pageItemIndex?: number;
    parts?: Survey;
    private item?;
    private precedingTable?;
    private section?;
    private buildParts;
    get columnNamesPart(): PageItem;
    get lineNamePart(): PageItem;
    get positionPart(): PageItem;
    start(survey: MutableSurvey, participant: MutableParticipant, pageIndex: number, index: number, section?: string | undefined): void;
    private getPrecedingTable;
    private getPartItems;
    apply(survey: MutableSurvey, participant: MutableParticipant, interviewItems: InterviewItem[]): void;
    private getPosition;
    bindPartItems(survey: Survey, interviewItems: InterviewItem[]): {
        insertedItems: PageItem[];
        insertedRules: CrossItemRule[];
    };
    canApply(survey: MutableSurvey, interviewItems: InterviewItem[]): boolean;
}

declare class DeleteItemCommand implements IMutationCommand {
    pageIndex?: number;
    pageItemIndex?: number;
    parts?: Survey;
    private items?;
    count: number;
    get applyPart(): PageItem;
    private buildParts;
    start(survey: MutableSurvey, participant: MutableParticipant, pageIndex: number, index: number, count?: number): void;
    apply(survey: MutableSurvey, participant: MutableParticipant): void;
    canApply(): boolean;
}

declare class DeletePageCommand implements IMutationCommand {
    pageSetIndex?: number;
    pageIndex?: number;
    parts?: Survey;
    private page?;
    private pageSet?;
    get applyPart(): PageItem;
    private buildParts;
    start(survey: MutableSurvey, participant: MutableParticipant, pageSetIndex: number, pageIndex: number): void;
    apply(survey: MutableSurvey, participant: MutableParticipant): void;
    canApply(): boolean;
}

declare class DeletePageSetCommand implements IMutationCommand {
    pageSetIndex?: number;
    pageIndex?: number;
    surveyPageIndex?: number;
    parts?: Survey;
    private pageSet?;
    private page?;
    get applyPart(): PageItem;
    private buildParts;
    start(survey: MutableSurvey, participant: MutableParticipant, pageSetIndex: number): void;
    apply(survey: MutableSurvey, participant: MutableParticipant): void;
    canApply(): boolean;
}

declare class DeleteWorkflowCommand implements IMutationCommand {
    pageSetIndex?: number;
    pageIndex?: number;
    surveyPageIndex?: number;
    parts?: Survey;
    private workflowIndex?;
    private workflow?;
    private page?;
    get applyPart(): PageItem;
    private buildParts;
    start(survey: MutableSurvey, participant: MutableParticipant, workflowIndex: number, pageSetIndex: number): void;
    apply(survey: MutableSurvey): void;
    canApply(): boolean;
}

declare class OrderItemCommand implements IMutationCommand {
    pageIndex?: number;
    pageItemIndex?: number;
    parts?: Survey;
    private page?;
    private pageItem?;
    private crossRules?;
    private buildParts;
    get directionPart(): PageItem;
    get applyPart(): PageItem;
    start(survey: MutableSurvey, participant: MutableParticipant, pageIndex: number, index: number): void;
    private getPartItems;
    apply(survey: MutableSurvey, participant: MutableParticipant, items: InterviewItem[]): void;
    private firstOrLast;
    private moveInSection;
    private changeSection;
    canApply(survey: Survey, items: InterviewItem[]): boolean;
}

declare function getApplyItem(interviewItems: InterviewItem[]): InterviewItem | undefined;

declare type StudioState<T extends IMutationTarget = IMutationTarget> = T & {
    survey: IDomainProxy<Survey>;
    participant: IDomainProxy<Participant>;
    start<U extends IMutationCommand<S>, S extends unknown[]>(cmd: {
        new (): U;
    }, ...args: S): Promise<IMutationResult<T>>;
    canApply(items: InterviewItem[]): boolean;
    apply(items: InterviewItem[]): T;
    cancel(): T;
};
declare type IStudioState = StudioState<IStatefulMutationTarget> & {
    interview: Interview;
    init(keys: PartialInterview): Interview;
};
interface SurveyState extends Survey, IDomainProxy<Survey> {
}
declare class SurveyState {
    value: Survey;
    constructor(value: Survey);
    update(kwargs: Partial<Survey>): SurveyState;
}
declare type IMutationResult<T extends IMutationTarget = IMutationTarget> = {
    result: "canceled" | "applied";
} & T;
declare type IMutationTarget = {
    interview?: Interview;
    pageSet?: PageSet;
    page?: Page;
    pageItem?: PageItem;
};
declare type IStatefulMutationTarget = Required<Pick<IMutationTarget, "interview" | "pageSet">> & IMutationTarget;
interface ParticipantState extends Participant, IDomainProxy<Participant> {
}
declare class ParticipantState implements StudioState, IMutationTarget {
    readonly survey: IDomainProxy<Survey>;
    value: Participant;
    private nullCommand;
    private pending;
    private interviewIndex;
    constructor(survey: IDomainProxy<Survey>, value: Participant);
    private nullContext;
    get interview(): Interview | undefined;
    get pageSet(): PageSet | undefined;
    get page(): Page | undefined;
    get pageItem(): PageItem | undefined;
    get participant(): IDomainProxy<Participant>;
    get isIdle(): boolean;
    get isPending(): boolean;
    getState(interview: Interview): IStudioState;
    start<T extends IMutationCommand<S>, S extends unknown[]>(cmd: {
        new (): T;
    }, ...args: S): Promise<IMutationResult>;
    private startContext;
    canApply(items: InterviewItem[]): boolean;
    apply(items: InterviewItem[]): IMutationTarget;
    private applyContext;
    private getTargets;
    private getInterview;
    private getPageSet;
    private getPage;
    private getPageItem;
    cancel(): IMutationTarget;
    update(kwargs: Partial<Participant>): ParticipantState;
    init(keys: PartialInterview): Interview;
    private initUpdate;
}

declare class StudioDrivers implements ClientDrivers {
    surveyDriver: ISurveyDriver;
    sampleDriver: ISampleDriver;
    participantDriver: IParticipantDriver & IParticipantDeleteDriver;
    interviewDriver: IInterviewDriver & IInterviewDeleteDriver;
    summaryDriver: ISummaryDriver;
    userDriver: IUserDriver;
    auditDriver: IAuditDriver;
    documentDriver: IDocumentDriver;
    kpiDriver: IKpiDriver;
    client: Got;
    constructor(drivers: ClientDrivers);
}

interface SurveyTemplate extends Survey {
}
declare class SurveyTemplate {
    constructor(name: string);
}

interface ParticipantTemplate extends Participant {
}
declare class ParticipantTemplate {
    constructor(survey: SurveyTemplate, sample: Sample);
}

declare class UnfoldLayout extends Array<LayoutSection<Item>> {
    constructor(layout: IDomainCollection<LayoutSection<Item>>, pageItem: Item);
}

export { ChoiceList, DeleteItemCommand, DeletePageCommand, DeletePageSetCommand, DeleteWorkflowCommand, IMutationCommand, IStudioState, InsertItemCommand, InsertPageCommand, InsertPageSetCommand, InsertTableLineCommand, InsertWorkflowCommand, NullCommand, OrderItemCommand, ParticipantState, ParticipantTemplate, ScoreList, StudioDrivers, StudioState, SurveyState, SurveyTemplate, UnfoldLayout, UniquePageItemRule, UniquePageRule, UniquePageSetRule, UniqueWorkflowRule, UpdateItemCommand, UpdatePageCommand, UpdatePageSetCommand, UpdateSurveyOptionsCommand, UpdateWorkflowCommand, allInRangeSet, allRequiredSet, allUniqueSet, getApplyItem, parseRangeValue };
