import json
import scrapy
from scrapy.http import HtmlResponse


class PanopticaSpider(scrapy.Spider):
    name = "panoptica"
    allowed_domains = ["docs.panoptica.app"]
    start_urls = ["https://docs.panoptica.app/docs"]

    def __init__(self, url, versions=None, *args, **kwargs):
        self.start_urls = [url]
        self.product = ["panoptica"]
        self.versions = versions if versions else []

        super().__init__(*args, **kwargs)

        self.data = []

    def parse(self, response: HtmlResponse):
        # get all links under ul#bookToc
        links = response.css("a.rm-Sidebar-link")

        for link in links:
            # get href attribute
            href = link.attrib["href"]

            # check if the link is relative
            if not href.startswith("http"):
                href = f"https://docs.panoptica.app{href}"

            yield response.follow(href, callback=self.parse_chapter)

    def closed(self, reason):
        filename = f"data/queue/docs/{self.name}-{self.versions[0]}.json"
        with open(filename, "w") as f:
            json.dump(self.data, f)

        self.log(f"Saved file {filename}!")

    def parse_chapter(self, response: HtmlResponse):
        # header get all text content even from nested tags
        header = response.css("header#content-head h1::text").get()

        # get all text in article
        text = response.css("div#content-container div.markdown-body *::text").getall()
        # merge all text into one string
        text = " ".join([text.strip() for text in text if text.strip()])

        if not header or not text:
            print("No header or text found")
            return

        # strip consecutive spaces and newlines
        header = header.replace("\r", "").replace("\t", "").replace("\n", " ")
        header = " ".join(header.split())
        text = text.replace("\r", "").replace("\t", "").replace("\n", " ")
        text = " ".join(text.split())

        title = f"{header.strip()}"

        print(f"Parsed {title} ({response.url})")

        d = {
            "title": "Panoptica Documentation",
            "subtitle": title,
            "content": text,
            "url": response.url,
        }

        self.data.append(d)

        yield d


if __name__ == "__main__":
    from scrapy.crawler import CrawlerProcess

    docs = [
        {
            "url": "https://docs.panoptica.app/docs",
            "versions": ["1.0"],
        },
        {
            "url": "https://docs.panoptica.app/v2.0/docs",
            "versions": ["2.0"],
        },
    ]

    process = CrawlerProcess()
    for doc in docs:
        process.crawl(
            PanopticaSpider,
            doc["url"],
            versions=doc["versions"],
        )
        process.start()
