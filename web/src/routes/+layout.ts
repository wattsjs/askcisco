import type { Message } from "ai";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async (event) => {
  const query = event.url.searchParams.get("q")

  const messages = (query ? [{
    role: "user",
    content: query
  }] : []) as Message[];

  return {
    initialMessages: messages
  }
};
