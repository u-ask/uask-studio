import {
  DomainProxy,
  getItem,
  IDomainProxy,
  Interview,
  InterviewItem,
  MutableParticipant,
  MutableSurvey,
  Page,
  PageItem,
  PageSet,
  Participant,
  Survey,
} from "uask-dom";
import { PartialInterview } from "uask-sys";
import { IMutationCommand, NullCommand } from "../commands/index.js";

export type StudioState<T extends IMutationTarget = IMutationTarget> = T & {
  survey: IDomainProxy<Survey>;
  participant: IDomainProxy<Participant>;

  start<U extends IMutationCommand<S>, S extends unknown[]>(
    cmd: { new (): U },
    ...args: S
  ): Promise<IMutationResult<T>>;
  canApply(items: InterviewItem[]): boolean;
  apply(items: InterviewItem[]): T;
  cancel(): T;
};

export type IStudioState = StudioState<IStatefulMutationTarget> & {
  interview: Interview;
  init(keys: PartialInterview): Interview;
};

export interface SurveyState extends Survey, IDomainProxy<Survey> {}

export class SurveyState {
  constructor(public value: Survey) {
    return DomainProxy(this, value);
  }

  update(kwargs: Partial<Survey>): SurveyState {
    this.value = this.value.update(kwargs);
    return this;
  }
}

type CommandContext = {
  command: IMutationCommand;
  survey: Survey;
  participant: Participant;
  resolve: (changes: IMutationResult) => void;
  reject: (e: Error | string) => void;
};

type IMutationResult<T extends IMutationTarget = IMutationTarget> = {
  result: "canceled" | "applied";
} & T;

type IMutationTarget = {
  interview?: Interview;
  pageSet?: PageSet;
  page?: Page;
  pageItem?: PageItem;
};

type IStatefulMutationTarget = Required<
  Pick<IMutationTarget, "interview" | "pageSet">
> &
  IMutationTarget;

export interface ParticipantState
  extends Participant,
    IDomainProxy<Participant> {}
export class ParticipantState implements StudioState, IMutationTarget {
  private nullCommand = new NullCommand();
  private pending: CommandContext;
  private interviewIndex: number | undefined;

  constructor(
    readonly survey: IDomainProxy<Survey>,
    public value: Participant
  ) {
    this.pending = this.nullContext();
    return DomainProxy(this, value);
  }

  private nullContext(): CommandContext {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const nullFn = () => {};
    return {
      survey: this.survey.value,
      participant: this.participant.value,
      command: this.nullCommand,
      resolve: nullFn,
      reject: nullFn,
    };
  }

  get interview(): Interview | undefined {
    return this.getInterview(this.pending);
  }

  get pageSet(): PageSet | undefined {
    return this.getPageSet(this.pending);
  }

  get page(): Page | undefined {
    return this.getPage(this.pending);
  }

  get pageItem(): PageItem | undefined {
    return this.getPageItem(this.pending);
  }

  get participant(): IDomainProxy<Participant> {
    return this;
  }

  get isIdle(): boolean {
    return this.pending.command == this.nullCommand;
  }

  get isPending(): boolean {
    return this.pending.command != this.nullCommand;
  }

  getState(interview: Interview): IStudioState {
    if (this.isIdle)
      this.interviewIndex = this.participant.interviews.indexOf(interview);
    return this as IStudioState;
  }

  start<T extends IMutationCommand<S>, S extends unknown[]>(
    cmd: { new (): T },
    ...args: S
  ): Promise<IMutationResult> {
    if (this.isPending) throw "Command is already started";
    const started = new Promise<IMutationResult>((resolve, reject) => {
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

  private startContext(args: unknown[]) {
    const mutableSurvey = new MutableSurvey(this.pending.survey);
    const mutableParticipant = new MutableParticipant(this.pending.participant);
    this.pending.command.start(mutableSurvey, mutableParticipant, ...args);
    return { mutableSurvey, mutableParticipant };
  }

  canApply(items: InterviewItem[]): boolean {
    return (
      typeof this.pending != "undefined" &&
      this.pending.command.canApply(this.pending.survey, items)
    );
  }

  apply(items: InterviewItem[]): IMutationTarget {
    try {
      const { mutableSurvey, mutableParticipant } = this.applyContext(items);
      this.survey.update(mutableSurvey.value);
      this.participant.update(mutableParticipant.value);
      const targets = this.getTargets(this.pending);
      const results = { result: "applied", ...targets } as IMutationResult;
      this.pending.resolve(results);
      this.pending = this.nullContext();
      return results;
    } catch (e) {
      this.pending?.reject(String(e));
      throw e;
    }
  }

  private applyContext(items: InterviewItem[]) {
    const mutableSurvey = new MutableSurvey(this.pending.survey);
    const mutableParticipant = new MutableParticipant(this.pending.participant);
    this.pending.command.apply(mutableSurvey, mutableParticipant, items);
    return { mutableSurvey, mutableParticipant };
  }

  private getTargets(context: CommandContext) {
    const interview = this.getInterview(context);
    const pageSet = this.getPageSet(context);
    const page = this.getPage(context);
    const pageItem = this.getPageItem(context);
    return { interview, pageSet, page, pageItem };
  }

  private getInterview({ command: { pageSetIndex } }: CommandContext) {
    if (
      pageSetIndex == -1 ||
      (typeof pageSetIndex == "number" &&
        pageSetIndex >= this.survey.pageSets.length)
    )
      return this.participant.interviews[0];
    const pageSet =
      typeof pageSetIndex == "number" &&
      pageSetIndex < this.survey.pageSets.length
        ? this.survey.pageSets[pageSetIndex]
        : undefined;
    const interview =
      typeof this.interviewIndex == "number" &&
      this.interviewIndex < this.participant.interviews.length
        ? this.participant.interviews[this.interviewIndex]
        : undefined;
    const hasPageSet = interview && (!pageSet || interview.pageSet == pageSet);
    if (hasPageSet) return interview;
    this.interviewIndex = this.participant.interviews.findIndex(
      i => i.pageSet == pageSet
    );
    return this.participant.interviews[this.interviewIndex];
  }

  private getPageSet(context: CommandContext) {
    return this.getInterview(context)?.pageSet;
  }

  private getPage(context: CommandContext) {
    const {
      command: { pageSetIndex, pageIndex },
    } = context;
    if (
      pageIndex == -1 ||
      (typeof pageSetIndex == "number" &&
        pageSetIndex >= this.survey.pageSets.length) ||
      (typeof pageSetIndex == "number" &&
        typeof pageIndex == "number" &&
        pageIndex >= this.survey.pageSets[pageSetIndex].pages.length)
    )
      return this.getPageSet(context)?.pages[0];
    return typeof pageSetIndex == "number" && typeof pageIndex == "number"
      ? this.survey.pageSets[pageSetIndex].pages[pageIndex]
      : typeof pageIndex == "number" && pageIndex < this.survey.pages.length
      ? this.survey.pages[pageIndex]
      : undefined;
  }

  private getPageItem({
    command: { pageIndex, pageItemIndex },
  }: CommandContext) {
    if (
      pageItemIndex == -1 ||
      (typeof pageItemIndex == "number" &&
        pageItemIndex >= this.survey.pages[pageIndex as number].items.length)
    )
      return undefined;
    return typeof pageIndex == "number" && typeof pageItemIndex == "number"
      ? getItem(this.survey.pages[pageIndex].items[pageItemIndex])
      : undefined;
  }

  cancel(): IMutationTarget {
    if (this.isIdle) throw "Command is not started";
    try {
      this.survey.update(this.pending.survey);
      this.participant.update(this.pending.participant);
      const targets = this.getTargets(this.pending);
      const results = { result: "canceled", ...targets } as IMutationResult;
      this.pending.resolve(results);
      this.pending = this.nullContext();
      return results;
    } catch (e) {
      this.pending?.reject(String(e));
      throw e;
    }
  }

  update(kwargs: Partial<Participant>): ParticipantState {
    this.value = this.value.update(kwargs);
    return this;
  }

  init(keys: PartialInterview): Interview {
    if (typeof this.interviewIndex == "undefined")
      throw "call getState() before";
    this.value = this.initUpdate(this.value, keys);
    if (typeof this.pending != "undefined")
      this.pending.participant = this.initUpdate(
        this.pending.participant,
        keys
      );
    return this.value.interviews[this.interviewIndex];
  }

  private initUpdate(participant: Participant, keys: PartialInterview) {
    return participant.update({
      interviews: participant.interviews.map((i, x) =>
        x == this.interviewIndex ? i.update(keys) : i
      ),
    });
  }
}
