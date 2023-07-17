import json
import logging
import os
import sys

from scrapy.crawler import CrawlerProcess

from pipeline.scraping.cisco_docs import CiscoDocsSpider

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def main():
    docs = get_queued_docs()
    existing_docs = get_scraped_docs()
    if docs:
        # check if --force flag is passed in args
        force = True
        if "--force" in sys.argv:
            force = True
        if not force:
            docs = [
                d
                for d in docs
                if (
                    ("version" not in d or d["version"] == "")
                    and f'{d["slug"]}' not in existing_docs
                )
                or f'{d["slug"]}-{d.get("version")}' not in existing_docs
                if "version" in d
            ]

        if not docs:
            logging.info("no new docs to process")
            return
        process = CrawlerProcess()
        for doc in docs:
            products = doc.get("products", [])
            if "product" in doc:
                products.append(doc["product"])

            versions = doc.get("versions", [])
            if "version" in doc:
                versions.append(doc["version"])

            process.crawl(
                CiscoDocsSpider,
                name=doc["slug"],
                url=doc["source"],
                versions=versions,
                products=products,
            )
        process.start()


def get_scraped_docs():
    urls: list[str] = []
    # read all file names from data/queue/docs
    # add each file name to a list and return it
    for file in os.listdir("data/queue/docs"):
        if file.endswith(".json"):
            urls.append(file.rstrip(".json"))
    return urls


def get_queued_docs():
    urls: list[dict] = []
    with open("data/queue/docs.json", "r") as f:
        d = f.read()
        if not d:
            logging.info("no new docs to process")
            return
        urls = json.loads(d)
        urls = [u for u in urls if "source" in u and "slug" in u]

    return urls


if __name__ == "__main__":
    main()
