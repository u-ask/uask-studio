import {
  UnitRule,
  Survey,
  HasValue,
  setMessageIf,
  update,
  isMLstring,
  getTranslation,
  Page,
  PageSet,
  CrossRule,
  Workflow,
  SurveyOptions,
  mlstring,
  Rules,
} from "uask-dom";

export class AllLanguagesSetRule implements UnitRule {
  name = "allLanguages";
  precedence = 90;

  constructor(readonly options: SurveyOptions) {}
  execute(a: HasValue): HasValue {
    const messages = setMessageIf(
      this.options.languages && this.options.languages?.length > 1
        ? this.emptyMlString(a)
        : a.value != undefined && a.value != ""
    )(a.messages, "allLanguages", "all languages must be set");
    return update(a, { messages });
  }

  private emptyMlString(a: HasValue) {
    return (
      !isMLstring(a.value) ||
      Object.keys(a.value).length != this.options.languages?.length ||
      !!Object.keys(a.value).some(
        k =>
          (a.value as Readonly<Record<string, string>>)[k] == undefined ||
          (a.value as Readonly<Record<string, string>>)[k].trim() == ""
      )
    );
  }
}

export class VariableAndLanguageSetRule implements UnitRule {
  name = "variableAndAllLanguages";
  precedence = 90;

  private readonly required: UnitRule;
  private readonly allLangs: UnitRule;

  constructor(readonly options: SurveyOptions) {
    this.required = Rules.required();
    this.allLangs = new AllLanguagesSetRule(this.options);
  }

  execute(arg: HasValue): HasValue {
    const v = arg.value as { name: string; label: mlstring }[];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { required, allLanguages, ...messages } = arg.messages as {
      required?: string;
      allLanguages?: string;
    };
    const result = v.reduce(
      (a, v) => {
        const r1 = this.required.execute({ ...a, value: v.name });
        const r2 = this.allLangs.execute({
          ...r1,
          value: v.label,
        });
        return {
          ...r2,
          messages: { ...a.messages, ...r2.messages },
          value: a.value,
        };
      },
      { ...arg, messages }
    );
    return update(arg, result);
  }
}

export class UniquePageItemRule implements UnitRule {
  constructor(readonly survey: Survey) {}
  execute(a: HasValue): HasValue {
    const messages = setMessageIf(
      !!this.survey.items.find(i => i.variableName == a.value)
    )(a.messages, "unique", "variable name must be unique");
    return update(a, { messages });
  }
  name = "unique";
  precedence = 100;
}

export class UniquePageRule implements UnitRule {
  readonly name = "unique";
  readonly precedence = 100;

  constructor(readonly survey: Survey, readonly page: Page) {}

  execute(a: HasValue): HasValue {
    const messages = setMessageIf(this.pageAlreadyExist(a.value as string))(
      a.messages,
      "unique",
      "page name must be unique"
    );
    return update(a, { messages });
  }

  private pageAlreadyExist(pageCode: string) {
    return !!this.survey.pages.find(
      p =>
        getTranslation(p.name, "__code__", this.survey.options.defaultLang) ==
        pageCode
    );
  }
}

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

export class UniqueWorkflowRule implements CrossRule {
  constructor(readonly survey: Survey, readonly workflow: Workflow) {}

  execute(names: HasValue, spec: HasValue): [HasValue, HasValue] {
    const messages = setMessageIf(
      this.workflowAlreadyExist(names.value as string[], spec.value as string)
    )(spec.messages, "unique", "workflow name:specifier must be unique");
    return [names, update(spec, { messages: { ...messages } })];
  }

  workflowAlreadyExist(names: string[], spec: string): boolean {
    const namesWithWpec = names?.map(
      name => `${name}${spec ? `:${spec}` : ""}`
    );
    return this.survey.workflows.some(w => namesWithWpec?.includes(w.name));
  }

  name = "unique";
  precedence = 100;
}
