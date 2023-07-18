# Ask Jamie AI Chatbot
A simple AI chat bot that can answer questions about Cisco products and services.

## How it works
1. Various public Cisco documentation sites are scraped, vectorized using the OpenAI embedding API, and saved as training data in a vector database (Qdrant)
2. The user asks a question about Cisco products and services.
3. The question is sent to OpenAI's embedding API to get a vector representation of the question.
4. Vector similarity is used to find the most similar data/documents in the training data.
5. Those are then used as context (system knowledge) to generate an answer using the same OpenAI model that ChatGPT uses.
