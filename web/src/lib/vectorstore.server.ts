import { QDRANT_API_KEY,QDRANT_URL } from '$env/static/private';
import {QdrantClient} from '@qdrant/js-client-rest';

export const qdrantClient = new QdrantClient({url: QDRANT_URL, apiKey: QDRANT_API_KEY});
