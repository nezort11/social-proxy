export const getChatId = (id: string) => {
  return `-100${id}`;
};

export function delay(time: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

// https://github.com/TypeStrong/ts-node/discussions/1290
export const dynamicImport = new Function(
  "specifier",
  "return import(specifier)"
) as <T>(module: string) => Promise<T>;

export const importPTimeout = async () =>
  await dynamicImport<typeof import("p-timeout")>("p-timeout");
