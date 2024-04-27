import { RFunction, Shelter, WebR } from "webr";

const rFunctions = {
  getTokens: "ls",
  getFunctionDefs: "lsf.str",
} as const;

type RFunctionName = keyof typeof rFunctions;

export const getRFunction = async (webR: WebR, fnName: RFunctionName) => {
  const fn = (await webR.evalR(rFunctions[fnName])) as RFunction;

  return fn;
};

interface RFunctionResult<TValue> {
  values: TValue[];
}

export async function callRFunction<TValue>(
  webR: WebR,
  fnName: RFunctionName,
  ...params: string[]
): Promise<RFunctionResult<TValue>> {
  const fn = await getRFunction(webR, fnName);

  return fn(...params) as Promise<RFunctionResult<TValue>>;
}

export async function captureROutput<T>(shelter: Shelter, code: string): Promise<T[]> {
  const result = await shelter.captureR(code);

  return result.output.map((x) => x.data as T);
}

export async function getFnDefs(shelter: Shelter) {
  const baseFunctionsDefs = await captureROutput<string>(shelter, `print(lsf.str("package:base"))`);
  const statsFunctionsDefs = await captureROutput<string>(shelter, `print(lsf.str("package:stats"))`);

  return [...baseFunctionsDefs, ...statsFunctionsDefs]
    .map((x) => x.trim())
    .filter((x) => x.includes(" : function") && x.endsWith(")"))
    .map((x) => {
      return x.split(" : function ");
    })
    .reduce((acc, curr) => {
      const [name, str] = curr;

      const params = str.slice(1).slice(0, -1).split(", ");
      return { ...acc, [name]: params };
    }, {} as Record<string, string[]>);
}
