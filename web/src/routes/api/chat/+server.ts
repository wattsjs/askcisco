import { OPENAI_API_KEY } from "$env/static/private";
import { ratelimit, redis } from "$lib/db.server";
import type { DataFilter } from "$lib/types.js";
import { qdrantClient } from "$lib/vectorstore.server.js";
import type { RequestHandler } from "@sveltejs/kit";

import { OpenAIStream, StreamingTextResponse, type Message } from "ai";
import {
  Configuration,
  OpenAIApi,
  type ChatCompletionRequestMessage,
} from "openai-edge";

// Create an OpenAI API client (that's edge friendly!)
const oaiConfig = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(oaiConfig);

// Set the runtime to edge for best performance
export const config = {
  runtime: "edge",
};
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  // check for rate limit
  const ip = getClientAddress();
  const rateLimitAttempt = await ratelimit.limit(ip);
  if (!rateLimitAttempt.success) {
    const timeRemaining = Math.floor(
      (rateLimitAttempt.reset - new Date().getTime()) / 1000
    );

    return new Response(
      `Too many requests. Please try again in ${timeRemaining} seconds.`,
      {
        status: 429,
        headers: {
          "Retry-After": timeRemaining.toString(),
        },
      }
    );
  }

  const { messages, filter } = (await request.json()) as {
    messages: Message[];
    filter?: DataFilter;
  };

  // join all user messages together
  const user_messages = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content);

  let prompt = user_messages[0];

  // if this there are multiple messages from the user, try and find a "contextual" query using the
  // response from the previous query
  if (user_messages.length > 1) {
    // generate "chat history"
    let chatHistory = "";
    for (const message of messages.slice(0, -1)) {
      if (message.role === "user") {
        chatHistory += `User: ${message.content}\n`;
      } else {
        chatHistory += `System: ${message.content}\n`;
      }
    }

    prompt = `
    Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.
    Chat History:
    ${chatHistory}
    Follow Up Input: ${user_messages[user_messages.length - 1]}
    Standalone question:`;

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-16k",
      temperature: 0,
      messages: [
        {
          content: prompt,
          role: "user",
        },
        {
          content: user_messages[user_messages.length - 1],
          role: "user",
        },
      ],
    });

    const responseResult = (await response.json()) as {
      choices: {
        message: {
          content: string;
          role: "assistant" | "user" | "system";
        };
      }[];
    };
    if (responseResult.choices[0].message.content) {
      prompt = responseResult.choices[0].message.content;
    }
  }

  console.log(`Prompt: ${prompt}`);
  const queryEmbedding = await openai.createEmbedding({
    input: prompt,
    model: "text-embedding-ada-002",
  });
  const embedding = await queryEmbedding.json();

  const docsFilter = {
    must: [] as unknown[],
    must_not: [] as unknown[],
  };

  console.log(`Filters: ${JSON.stringify(filter)}`);

  if (filter?.version && filter.version !== "All Versions") {
    docsFilter["must"].push({
      should: [
        {
          key: "metadata.versions",
          match: {
            value: filter.version,
          },
        },
        {
          key: "metadata.version",
          match: {
            value: filter.version,
          },
        },
        {
          must: [
            {
              is_empty: {
                key: "metadata.versions",
              },
            },
            {
              is_empty: {
                key: "metadata.version",
              },
            },
          ],
        },
      ],
    });
  }
  if (filter?.product && filter.product !== "All Products") {
    docsFilter["must"].push({
      should: [
        {
          key: "metadata.products",
          match: {
            value: filter.product.toLowerCase(),
          },
        },
        {
          key: "metadata.product",
          match: {
            value: filter.product.toLowerCase(),
          },
        },
      ],
    });
  }
  if (
    (!filter?.product && !filter?.version) ||
    (filter.product === "All Products" && filter.version === "All Versions")
  ) {
    docsFilter["must_not"].push({
      key: "metadata.outdated",
      match: {
        value: true,
      },
    });
  }

  const docs = (await qdrantClient.search("askcisco.com", {
    vector: embedding.data[0].embedding,
    limit: 10,
    filter: docsFilter,
  })) as unknown as {
    payload: {
      page_content: string;
      metadata: {
        source: string;
        products: string[];
        versions: string[];
        outdated: boolean;
        title?: string;
        subtitle?: string;
      };
    };
  }[];

  console.log(`Found ${docs.length} documents`);

  // filter out any duplicate sources
  // this is because the sources are chunked
  const docContent = docs
    .filter((doc) => doc?.payload?.metadata?.source)
    .map((doc) => {
      return {
        ...doc.payload.metadata,
      };
    })
    .filter(
      (doc, index, self) =>
        index === self.findIndex((t) => t.source === doc.source)
    );

  // check if the hash is in the KV store
  // only cache first response
  if (user_messages.length === 1) {
    const key = [filter?.product, filter?.version, user_messages[0]].join(
      ":::"
    );
    const cachedResponse = (await redis.get(key)) as string;
    if (cachedResponse) {
      console.log(`Cache hit for ${key}`);
      return new Response(cachedResponse, {
        headers: {
          "x-cache-hit": "true",
          "x-response-data": JSON.stringify(docContent),
        },
      });
    }
  }

  const system_messages = [
    `You are a world class algorithm to answer questions with correct and exact citations`,
    `You are a Cisco technical expert trained to answer questions about Cisco products to a technical audience.`,
  ];

  const prompt_messages = ["Answer question using the following context"];

  if (docs.length > 0) {
    for (const doc of docs) {
      if (doc.payload?.page_content && doc.payload?.metadata?.source) {
        let context = `Document: ${doc.payload?.page_content}\nSource: ${doc.payload?.metadata?.source}`;
        if (doc.payload?.metadata?.title) {
          context = `\nTitle: ${doc.payload?.metadata?.title}\n${context}`;
        }
        if (doc.payload?.metadata?.subtitle) {
          context = `\nSubtitle: ${doc.payload?.metadata?.subtitle}\n${context}`;
        }
        // system_messages.push(context);
        prompt_messages.push(context);
      }
    }

    const combinedMessages = [];
    for (const message of system_messages) {
      combinedMessages.push({
        content: message,
        role: "system",
      });
    }

    for (const message of prompt_messages) {
      combinedMessages.push({
        content: message,
        role: "user",
      });
    }

    if (user_messages.length > 1) {
      // add all but the last message
      for (const message of user_messages.slice(0, -1)) {
        combinedMessages.push({
          content: `Previous question: ${message}`,
          role: "user",
        });
      }
    }
    // add the most recent message
    combinedMessages.push({
      content: `Question: ${prompt}`,
      role: "user",
    });

    combinedMessages.push({
      content: `Tips:
        - Assume that the user is a technical expert.
        - Make sure to cite your sources, and use the exact words from the context.
        - Include a excerpt from the context in your answer.
        - Always include the subtitle in the source
        - Use a markdown list to present sources.
        - Always explain in depth the technical details from the context.
        - Refer to any context as 'training data'.

        Example:
        ========
        Question: Is X supported on Y?
        Answer: Yes, X is supported by engaging the flux neutrons in Y. It is called the "Discombobulator" feature.  
        **Sources**
        - [{title} - {subtitle}]({source})
        ========`,
      role: "user",
    });

    combinedMessages.push({
      content: `Answer:`,
      role: "user",
    });

    // console.log(combinedMessages);

    // Create a chat completion using OpenAIApi
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-16k",
      stream: true,
      temperature: 0,
      messages: combinedMessages as ChatCompletionRequestMessage[],
    });

    // Transform the response into a readable stream
    const stream = OpenAIStream(response, {
      async onCompletion(completion) {
        if (user_messages.length === 1)
          // Cache the response
          await redis.set(
            [filter?.product, filter?.version, user_messages[0]].join(":::"),
            completion,
            {
              // expire after 1 hour
              ex: 60 * 60,
            }
          );
      },
    });

    // Return a StreamingTextResponse, which can be consumed by the client
    return new StreamingTextResponse(stream, {
      headers: {
        "x-response-data": JSON.stringify(docContent),
      },
    });
  } else {
    // Create a chat completion using OpenAIApi
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-16k",
      stream: true,
      temperature: 0,
      messages: [
        {
          content:
            "Explain to the user that the training data does not contain any information about the question they asked.",
          role: "system",
        },
      ] as ChatCompletionRequestMessage[],
    });

    // Transform the response into a readable stream
    const stream = OpenAIStream(response, {});

    // Return a StreamingTextResponse, which can be consumed by the client
    return new StreamingTextResponse(stream, {});
  }
};
