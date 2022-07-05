import {
  CrossItemRule,
  DomainCollection,
  execute,
  getTranslation,
  HasValue,
  IDomainCollection,
  InterviewItem,
  mlstring,
  MutableParticipant,
  MutableSurvey,
  PageItem,
  PageSet,
  PageSetBuilder,
  Scope,
  setMessageIf,
  Survey,
  SurveyBuilder,
  UnitRule,
  update,
} from "uask-dom";
import { allRequiredSet, allUniqueSet, IMutationCommand } from "../command.js";
import { UpdatePageSetCommand } from "../update/updatepagesetcommand.js";
import { libInsertPageSet } from "./libinsertpageset.js";

export class UniquePageSetRule implements UnitRule {
  constructor(readonly survey: Survey, readonly pageSet: PageSet) {}
  execute(a: HasValue): HasValue {
    const messages = setMessageIf(this.pageSetAlreadyExist(a.value as string))(
      a.messages,
      "unique",
      "page set code must be unique"
    );
    return update(a, { messages });
  }

  private pageSetAlreadyExist(pageSetCode: string) {
    return !!this.survey.pageSets.find(
      p =>
        getTranslation(p.type, "__code__", this.survey.options.defaultLang) ==
        pageSetCode
    );
  }

  name = "unique";
  precedence = 100;
}

export class InsertPageSetCommand implements IMutationCommand {
  pageSetIndex?: number;
  pageIndex?: number;
  surveyPageIndex?: number;
  parts?: Survey;
  private readonly updateCommand: UpdatePageSetCommand;
  private pageSet?: PageSet;
  private defaultLang?: string;

  constructor() {
    this.updateCommand = new UpdatePageSetCommand();
  }

  get codePart(): PageItem {
    return this.parts?.items.find(
      i => i.variableName == "__PAGE_SET_CODE__"
    ) as PageItem;
  }

  private buildParts(
    survey: Survey,
    section = {
      en: "New visit type",
      fr: "Nouvelle visite type",
    } as mlstring
  ) {
    const builder = new SurveyBuilder();
    libInsertPageSet(builder, "insertPageSet", section);
    this.parts = builder.get();
    this.parts = this.parts?.update({
      crossRules: this.parts.crossRules.append(
        new CrossItemRule(
          this.codePart,
          new UniquePageSetRule(survey, this.pageSet as PageSet)
        )
      ),
    });
  }

  start(
    survey: MutableSurvey,
    participant: MutableParticipant,
    section?: mlstring
  ): void {
    this.defaultLang = survey.options.defaultLang;

    this.pageSet = this.buildNewPageSet();
    survey.insertPageSet(this.pageSet);
    participant.insertPageSet(this.pageSet, survey.options);
    this.pageSetIndex = survey.pageSets.findIndex(ps => ps == this.pageSet);

    this.updateCommand.start(
      survey,
      participant,
      this.pageSetIndex,
      section ?? {
        en: "New visit type",
        fr: "Nouveau type de visite",
      }
    );
    this.pageIndex = this.updateCommand.pageIndex as number;
    this.surveyPageIndex = this.updateCommand.surveyPageIndex as number;

    this.buildParts(survey, section);

    survey.insertItems(
      this.surveyPageIndex,
      0,
      [...(this.parts?.items as IDomainCollection<PageItem>)],
      [...(this.parts?.crossRules as IDomainCollection<CrossItemRule>)]
    );

    participant.updatePageSets(survey.pageSets);
    participant.insertItems(this.getPartItems());
  }

  private buildNewPageSet() {
    const pageSetBuilder = new SurveyBuilder()
      .pageSet("NEWPAGESET")
      .translate("en", "New Visit")
      .translate("fr", "Nouvelle Visite") as PageSetBuilder;
    return pageSetBuilder.build([]);
  }

  private getPartItems(): IDomainCollection<InterviewItem> {
    const code = getTranslation(
      this.pageSet?.type,
      "__code__",
      this.defaultLang
    );
    return DomainCollection(
      ...this.getPartMessages(new InterviewItem(this.codePart, code))
    );
  }

  private getPartMessages(...items: InterviewItem[]) {
    const scope = Scope.create([]).with(items);
    return execute((this.parts as Survey).rules, scope).items;
  }

  apply(
    survey: MutableSurvey,
    participant: MutableParticipant,
    interviewItems: InterviewItem[]
  ): void {
    const { insertedPageSet } = this.bindPartItems(survey.value, interviewItems);
    survey.insertPageSet(insertedPageSet);

    participant.updatePageSets(survey.pageSets);
    participant.insertPageSet(insertedPageSet, survey.options);
  }

  private bindPartItems(
    survey: Survey,
    interviewItems: InterviewItem[]
  ): { insertedPageSet: PageSet } {
    const code = {
      __code__: interviewItems.find(i => i.pageItem == this.codePart)
        ?.value as string,
    };
    const { updatedPageSet } = this.updateCommand.bindPartItems(
      survey,
      interviewItems
    );
    const insertedPageSet = updatedPageSet.update({
      type: {
        ...(typeof updatedPageSet.type == "string"
          ? { [this.defaultLang as string]: updatedPageSet.type }
          : updatedPageSet.type),
        ...code,
      },
    });
    return { insertedPageSet };
  }

  canApply(survey: Survey, interviewItems: InterviewItem[]): boolean {
    const allParts = [
      ...(this.updateCommand.parts?.items as IDomainCollection<PageItem>),
      ...(this.parts?.items as IDomainCollection<PageItem>),
    ];
    return (
      allRequiredSet(allParts, interviewItems) &&
      allUniqueSet(allParts, interviewItems)
    );
  }
}
