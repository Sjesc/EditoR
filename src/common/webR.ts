import { RFunction, Shelter } from "webr";
import { state } from "../main";

const rFunctions = {
  getTokens: "ls",
  getFunctionDefs: "lsf.str",
} as const;

type RFunctionName = keyof typeof rFunctions;

export const getRFunction = async (fnName: RFunctionName) => {
  const fn = (await state.webR.evalR(rFunctions[fnName])) as RFunction;

  return fn;
};

interface RFunctionResult<TValue> {
  values: TValue[];
}

export async function callRFunction<TValue>(
  fnName: RFunctionName,
  ...params: string[]
): Promise<RFunctionResult<TValue>> {
  const fn = await getRFunction(fnName);

  return fn(...params) as Promise<RFunctionResult<TValue>>;
}

export async function captureROutput<T>(shelter: Shelter, code: string): Promise<T[]> {
  const result = await shelter.captureR(code);

  return result.output.map((x) => x.data as T);
}
