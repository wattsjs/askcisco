import { OPENAI_API_KEY } from '$env/static/private';
import type { DataFilter } from '$lib/types.js';
import { qdrantClient } from '$lib/vectorstore.server.js';
import { OpenAIStream, StreamingTextResponse, type Message } from 'ai';
import { Configuration, OpenAIApi, type ChatCompletionRequestMessage } from 'openai-edge';

// Create an OpenAI API client (that's edge friendly!)
const oaiConfig = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(oaiConfig);

// Set the runtime to edge for best performance
export const config = {
  runtime: 'edge',
}

export async function POST({ request }) {
  const { messages, filter } = await request.json() as { messages: Message[], filter: DataFilter }

  // join all user messages together
  const user_messages = messages.filter((message) => message.role === 'user').map((message) => message.content).join('? ')
  console.log({ user_messages, messages })
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
      }]
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

  console.log(JSON.stringify(docsFilter))

  const docs = await qdrantClient.search('askcisco.com', {
    vector: embedding.data[0].embedding,
    limit: 8,
    filter: docsFilter,
    score_threshold: 0.8,
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

  console.log({ docs })

  const system_messages = [
    "Use ONLY the following context to answer the question given.",
    "Answer any following questions only based on the documents.",
    "NEVER use any other documents or context or knowledge to answer the question.",
    "NEVER directly reference any of the documents, only derive information from them.",
    "ALWAYS Use brevity in your responses.",
    "Refer to any context as 'training data'.",
    "Always respond in markdown format. Use markdown tables and lists to present data, processes, and steps.",
    "Never mention any personally identifiable information.",
    "Never mention any customer names.",
    "Never refer to yourself"
  ]

  console.log(`Found ${docs.length} documents`)

  if (docs.length > 0) {
    for (const doc of docs) {
      if (doc.payload?.page_content && doc.payload?.metadata?.source) {
        const context = `Document: ${doc.payload?.page_content}\nSource: ${doc.payload?.metadata?.source}\n`
        if (doc.payload?.metadata?.title) {
          system_messages.push(`Title: ${doc.payload?.metadata?.title}`)
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


    // prepend the system messages to the messages array
    messages.unshift({
      content: system_messages.join('\n'),
      role: 'system',
    } as Message)

    // Create a chat completion using OpenAIApi
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo-16k',
      stream: true,
      messages: messages as ChatCompletionRequestMessage[]
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