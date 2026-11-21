import "dotenv/config";
import { createAgent, tool } from "langchain";
import { z } from "zod";

const getWeather = tool((input) => {
  return `It's always sunny in ${input.city}!`;
}, {
  name: "get_weather",
  description: "Get the weather for a given city",
  schema: z.object({
    city: z.string().describe("The city to get the weather for"),
  }),
});

const agent = createAgent({
  model: "openai:gpt-5.6-terra",
  tools: [getWeather],
});

console.log("Invoking agent with query: What's the weather in San Francisco?");

try {
  const response = await agent.invoke({
    messages: [
      { role: "user", content: "What's the weather in San Francisco?" },
    ],
  });

  console.log("\nAgent Response:");
  // Extracting the content from the last message in the response
  const lastMessage = response.messages[response.messages.length - 1];
  console.log(lastMessage.content);
  
  console.log("\nFull response structure:");
  console.log(JSON.stringify(response, null, 2));
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("\nError invoking agent:", errorMessage);
  if (error instanceof Error && error.message?.includes("model_not_found")) {
    console.log("\nTip: The model 'gpt-5.6-terra' was not found. You might want to use a standard model like 'gpt-4o' or 'gpt-3.5-turbo'.");
  }
}
