export type ResponsesHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type ResponsesInputItem = {
  role: "user" | "assistant";
  content:
    | Array<{ type: "input_text"; text: string }>
    | Array<{ type: "output_text"; text: string }>
    | Array<
        | { type: "input_text"; text: string }
        | { type: "input_image"; image_url: string; detail: "low" }
      >;
};

export function buildResponsesInput(
  history: ResponsesHistoryItem[],
  message: string,
  imageData?: string,
): ResponsesInputItem[] {
  const input: ResponsesInputItem[] = history.map((item) =>
    item.role === "assistant"
      ? { role: "assistant", content: [{ type: "output_text", text: item.content }] }
      : { role: "user", content: [{ type: "input_text", text: item.content }] },
  );

  const content = [
    { type: "input_text" as const, text: message },
    ...(imageData
      ? [{ type: "input_image" as const, image_url: imageData, detail: "low" as const }]
      : []),
  ];

  input.push({ role: "user", content });
  return input;
}
