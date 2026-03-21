declare module "prompts" {
  interface PromptObject {
    type: string;
    name: string;
    message: string;
    choices?: Array<{
      title: string;
      description?: string;
      value: string | number;
      selected?: boolean;
    }>;
    hint?: string;
    instructions?: boolean | string;
    min?: number;
    validate?: (value: string) => boolean | string;
  }

  function prompts(
    options: PromptObject | PromptObject[],
  ): Promise<Record<string, any>>;

  export default prompts;
}
