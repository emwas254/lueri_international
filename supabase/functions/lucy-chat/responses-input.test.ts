import { assert, assertEquals, assertFalse } from "jsr:@std/assert";
import { buildResponsesInput } from "./responses-input.ts";

Deno.test("assistant greeting history uses output_text, never input_*", () => {
  const input = buildResponsesInput(
    [
      { role: "assistant", content: "Hello, I am Lucy." },
      { role: "user", content: "hello" },
    ],
    "hello",
  );

  assertEquals(input[0].role, "assistant");
  assertEquals(input[0].content, [{ type: "output_text", text: "Hello, I am Lucy." }]);
  assertFalse(JSON.stringify(input[0]).includes("input_"));
  assertEquals(input[1].content, [{ type: "input_text", text: "hello" }]);
  assertEquals(input[2].content, [{ type: "input_text", text: "hello" }]);
});

Deno.test("three-turn history preserves roles and content types", () => {
  const input = buildResponsesInput(
    [
      { role: "user", content: "What services do you offer?" },
      { role: "assistant", content: "We provide courier and delivery services." },
      { role: "user", content: "Do you offer same-day delivery?" },
    ],
    "What areas do you cover?",
  );

  assertEquals(input.map((item) => item.role), ["user", "assistant", "user", "user"]);
  assertEquals(input[0].content, [{ type: "input_text", text: "What services do you offer?" }]);
  assertEquals(input[1].content, [{ type: "output_text", text: "We provide courier and delivery services." }]);
  assertEquals(input[2].content, [{ type: "input_text", text: "Do you offer same-day delivery?" }]);
  assertEquals(input[3].content, [{ type: "input_text", text: "What areas do you cover?" }]);
});

Deno.test("user message with an image keeps input_text and input_image", () => {
  const imageData = "data:image/jpeg;base64,ZmFrZQ==";
  const input = buildResponsesInput([], "Describe this parcel.", imageData);

  assertEquals(input, [
    {
      role: "user",
      content: [
        { type: "input_text", text: "Describe this parcel." },
        { type: "input_image", image_url: imageData, detail: "low" },
      ],
    },
  ]);
});

Deno.test("empty history produces only the current user item", () => {
  const input = buildResponsesInput([], "hello");

  assertEquals(input, [
    { role: "user", content: [{ type: "input_text", text: "hello" }] },
  ]);
});
