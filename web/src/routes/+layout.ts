import type { Message } from "ai";
import type { LayoutLoad } from "./$types";
import { browser } from "$app/environment";

export const load: LayoutLoad = async (event) => {
  const query = event.url.searchParams.get("q")
  const productFilter = event.url.searchParams.get("product") ?? "All Products"
  const versionFilter = event.url.searchParams.get("version") ?? "All Versions"

  const messages = (query ? [{
    role: "user",
    content: query
  }] : []) as Message[];

  return {
    initialMessages: messages,
    initialProductFilter: productFilter,
    initialVersionFilter: versionFilter
  }
};
