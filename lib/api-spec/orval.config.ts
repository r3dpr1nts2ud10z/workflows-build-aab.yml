import { defineConfig, InputTransformerFn } from "orval";
import { readFile, writeFile } from "node:fs/promises";
import path from "path";

const root = path.resolve(__dirname, "..", "..");
const apiClientReactSrc = path.resolve(root, "lib", "api-client-react", "src");
const apiZodSrc = path.resolve(root, "lib", "api-zod", "src");

// Our exports make assumptions about the title of the API being "Api" (i.e. generated output is `api.ts`).
const titleTransformer: InputTransformerFn = (config) => {
  config.info ??= {};
  config.info.title = "Api";

  return config;
};

const fixGeneratedZod = async () => {
  const generatedZodPath = path.resolve(apiZodSrc, "generated", "api.ts");
  let source = await readFile(generatedZodPath, "utf8");

  const replacements: Array<[string, string]> = [
    [
      '"timestamp": zod.coerce.date().max(ingestTicketBodyTimestampMax),',
      '"timestamp": zod.string().datetime().max(ingestTicketBodyTimestampMax).pipe(zod.coerce.date()),',
    ],
    [
      "})).min(1).max(ingestTicketBodyLegsMax)\n})",
      "}).strict()).min(1).max(ingestTicketBodyLegsMax)\n}).strict()",
    ],
  ];

  for (const [generated, corrected] of replacements) {
    const occurrences = source.split(generated).length - 1;
    if (occurrences !== 1) {
      throw new Error(
        `Expected one generated Zod fragment, found ${occurrences}: ${generated}`,
      );
    }
    source = source.replace(generated, corrected);
  }

  await writeFile(generatedZodPath, source);
};

export default defineConfig({
  "api-client-react": {
    input: {
      target: "./openapi.yaml",
      override: {
        transformer: titleTransformer,
      },
    },
    output: {
      workspace: apiClientReactSrc,
      target: "generated",
      client: "react-query",
      mode: "split",
      baseUrl: "/api",
      clean: true,
      prettier: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: path.resolve(apiClientReactSrc, "custom-fetch.ts"),
          name: "customFetch",
        },
      },
    },
  },
  zod: {
    input: {
      target: "./openapi.yaml",
      override: {
        transformer: titleTransformer,
      },
    },
    output: {
      workspace: apiZodSrc,
      client: "zod",
      target: "generated",
      schemas: { path: "generated/types", type: "typescript" },
      mode: "split",
      clean: true,
      prettier: true,
      override: {
        zod: {
          coerce: {
            query: ['boolean', 'number', 'string'],
            param: ['boolean', 'number', 'string'],
            body: ['bigint', 'date'],
            response: ['bigint', 'date'],
          },
        },
        useDates: true,
        useBigInt: true,
      },
    },
    hooks: {
      afterAllFilesWrite: fixGeneratedZod,
    },
  },
});
