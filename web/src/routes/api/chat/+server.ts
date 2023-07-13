import { Configuration, OpenAIApi } from 'openai-edge';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { OPENAI_API_KEY } from '$env/static/private';
 
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
  const { messages } = await request.json()
 
  // Create a chat completion using OpenAIApi
  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    stream: true,
    messages
  })
 
  // Transform the response into a readable stream
  const stream = OpenAIStream(response)
 
  // Return a StreamingTextResponse, which can be consumed by the client
  return new StreamingTextResponse(stream, {

  })
}
