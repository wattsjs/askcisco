import { building } from "$app/environment";
import {
  KV_REST_API_TOKEN,
  KV_REST_API_URL, OPENAI_API_KEY
} from '$env/static/private';
import type { DataFilter } from '$lib/types.js';
import { qdrantClient } from '$lib/vectorstore.server.js';
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { OpenAIStream, StreamingTextResponse, type Message } from 'ai';
import { Configuration, OpenAIApi, type ChatCompletionRequestMessage } from 'openai-edge';

let redis: Redis;
let ratelimit: Ratelimit;

if (!building) {
  redis = new Redis({
    url: KV_REST_API_URL,
    token: KV_REST_API_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(2, "10 s"),
  });
}

// Create an OpenAI API client (that's edge friendly!)
const oaiConfig = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(oaiConfig);

// Set the runtime to edge for best performance
export const config = {
  runtime: 'edge',
}

export async function POST({ request, getClientAddress }) {

  // check for rate limit
  const ip = getClientAddress();
  const rateLimitAttempt = await ratelimit.limit(ip);
  if (!rateLimitAttempt.success) {
    const timeRemaining = Math.floor(
      (rateLimitAttempt.reset - new Date().getTime()) / 1000
    );

    return new Response(`Too many requests. Please try again in ${timeRemaining} seconds.`, {
      status: 429,
      headers: {
        "Retry-After": timeRemaining.toString(),
      },
    });
  }

  const { messages, filter } = await request.json() as { messages: Message[], filter: DataFilter }

  console.log(filter)

  // join all user messages together
  const user_messages = messages.filter((message) => message.role === 'user').map((message) => message.content).join('? ')

  const queryEmbedding = await openai.createEmbedding({
    input: user_messages,
    model: 'text-embedding-ada-002',
  })
  const embedding = await queryEmbedding.json()

  const docsFilter = {
    must: [] as any[],
    must_not: [] as any[]
  }

  console.log(filter)

  if (filter.version && filter.version !== "All Versions") {
    docsFilter['must'].push({
      "should": [{
        key: 'metadata.versions',
        match: {
          value: filter.version
        }
      }, {
        key: 'metadata.version',
        match: {
          value: filter.version
        }
      },
      {

        "must": [
          {
            "is_empty": {
              "key": "metadata.versions"
            }
          },
          {
            "is_empty": {
              "key": "metadata.version"
            }
          }
        ]
      }
      ]
    })
  }
  if (filter.product && filter.product !== "All Products") {
    docsFilter['must'].push({
      "should": [
        {
          key: 'metadata.products',
          match: {
            value: filter.product.toLowerCase()
          }
        },
        {
          key: 'metadata.product',
          match: {
            value: filter.product.toLowerCase()
          }
        }
      ]
    })
  }
  if ((!filter.product && !filter.version) || (filter.product === "All Products" && filter.version === "All Versions")) {
    docsFilter['must_not'].push({
      key: 'metadata.outdated',
      match: {
        value: true
      }
    })
  }

  const docs = await qdrantClient.search('askcisco.com', {
    vector: embedding.data[0].embedding,
    limit: 10,
    filter: docsFilter,
  }) as any as {
    payload: {
      page_content: string,
      metadata: {
        source: string,
        products: string[],
        versions: string[],
        outdated: boolean,
        title?: string,
      }
    }
  }[]


  const system_messages = [
    "You are a Cisco technical expert trained to answer questions about Cisco products to a technical audience.",
    "Use ONLY the following context to answer the question given.",
    "Explain with technical steps how to solve the problem or question, and do not explain concepts or theory unless asked.",
    "NEVER make up any information or talk about anything that is not directly mentioned in the documents below",
    "Answer any following questions only based on the documents.",
    "ALWAYS Use brevity in your responses, respond with a maximum of a paragraph.",
    "Refer to any context as 'training data'.",
    "Always respond in markdown format. Use markdown tables and lists to present data, processes, and steps.",
    "Never mention any personally identifiable information.",
    "Never mention any customer names.",
    "Never refer to yourself",
    "NEVER include any links to the source field of the documents you used to answer the question. NEVER make up any links or include links that are not directly mentioned in the documents.",
  ]

  console.log(`Found ${docs.length} documents`)

  if (docs.length > 0) {
    for (const doc of docs) {
      if (doc.payload?.page_content && doc.payload?.metadata?.source) {
        let context = `Document: ${doc.payload?.page_content}\nSource: ${doc.payload?.metadata?.source}\n`
        if (doc.payload?.metadata?.title) {
          context = `Title: ${doc.payload?.metadata?.title}\n${context}`
        }
        system_messages.push(context)
      }
    }

    const docContent = docs.filter((doc) => doc?.payload?.metadata?.source).map((doc) => {
      return {
        ...doc.payload.metadata
      }
    }).filter((doc, index, self) =>
      index === self.findIndex((t) => (
        t.source === doc.source
      ))
    )

    const combinedMessages = []
    for (const message of system_messages) {
      combinedMessages.push({
        content: message,
        role: 'system',
      })
    }
    for (const message of messages) {
      combinedMessages.push(message)
    }

    // Create a chat completion using OpenAIApi
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo-16k',
      stream: true,
      temperature: 0.8,
      messages: combinedMessages as ChatCompletionRequestMessage[]
    })

    // Transform the response into a readable stream
    const stream = OpenAIStream(response)

    // Return a StreamingTextResponse, which can be consumed by the client
    return new StreamingTextResponse(stream, {
      headers: {
        'x-response-data': JSON.stringify(docContent),
      }
    })
  } else {
    // Create a chat completion using OpenAIApi
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo-16k',
      stream: true,
      messages: [{
        content: "Explain to the user that the training data does not contain any information about the question they asked.",
        role: 'system',
      }] as ChatCompletionRequestMessage[]
    })

    // Transform the response into a readable stream
    const stream = OpenAIStream(response)

    // Return a StreamingTextResponse, which can be consumed by the client
    return new StreamingTextResponse(stream, {
    })
  }




}
