import { redis } from "$lib/db.server";
import type { RequestHandler } from "@sveltejs/kit";

export type RatePayload = {
  type: "up" | "down";
  product?: string;
  version?: string;
  question: string;
  answer: string;
};

export const POST: RequestHandler = async ({ request }) => {
  const payload = (await request.json()) as RatePayload;
  // check payload type
  if (!["up", "down"].includes(payload.type)) {
    return new Response("Invalid type", { status: 400 });
  }
  if (!payload.question || !payload.answer) {
    return new Response("Missing question or answer", { status: 400 });
  }

  // create a string key
  // by concatenating the category, version, and question
  const key = [payload.product, payload.version, payload.question].join(":::");

  if (payload.type === "up") {
    // cache the answer
    await redis.set(key, payload.answer, {
      // expire the answer after 7 days
      ex: 60 * 60 * 24 * 7,
    });
  } else if (payload.type === "down") {
    // delete the cached answer
    await redis.del(key);
  } else {
    return new Response("Invalid type", { status: 400 });
  }

  return new Response("OK");
};
