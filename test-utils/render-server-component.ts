import { PassThrough } from "node:stream";
import type { ReactNode } from "react";
import { renderToPipeableStream } from "react-dom/server";

export function renderServerComponent(element: ReactNode): Promise<string> {
  return new Promise((resolve, reject) => {
    let markup = "";
    const output = new PassThrough();

    output.on("data", (chunk: Buffer) => {
      markup += chunk.toString();
    });
    output.on("error", reject);
    output.on("end", () => resolve(markup));

    const stream = renderToPipeableStream(element, {
      onAllReady() {
        stream.pipe(output);
      },
      onError: (error) => reject(error),
    });
  });
}
