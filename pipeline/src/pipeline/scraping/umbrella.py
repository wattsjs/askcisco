import json
import scrapy
from scrapy.http import HtmlResponse


class UmbrellaSpider(scrapy.Spider):
    name = "umbrella"
    allowed_domains = ["docs.umbrella.com"]
    start_urls = [
        "https://docs.umbrella.com/umbrella-user-guide/docs/start-protecting-your-systems"
    ]

    def __init__(self, name=None, **kwargs):
        super().__init__(name, **kwargs)

        self.data = []

    def parse(self, response: HtmlResponse):
        # get all links under ul#bookToc
        links = response.css("div#hub-sidebar-content li a")

        for link in links:
            # get href attribute
            href = link.attrib["ui-sref"]
            # in format like docs.show({'doc': 'start-protecting-your-systems'})
            href = href.split("'")[3]
            href = f"/umbrella-user-guide/docs/{href}"
            print(href)

            # check if the link is relative
            if not href.startswith("http"):
                href = f"https://docs.umbrella.com{href}"

            yield response.follow(href, callback=self.parse_chapter)

    def closed(self, reason):
        filename = f"data/queue/docs/{self.name}.json"
        with open(filename, "w") as f:
            json.dump(self.data, f)

        self.log(f"Saved file {filename}!")

    def parse_chapter(self, response: HtmlResponse):
        # header get all text content even from nested tags
        header = response.css("section#hub-content h1::text").get()

        # get all text in article
        text = response.css("div#content-container *::text").getall()
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

        # get parent title from sidebar
        parent = response.xpath(
            "//a[contains(@class, 'subpage active')]//ancestor::li//a//text()"
        ).get()
        section = response.xpath(
            "//a[contains(@class, 'subpage active')]//ancestor::div//h3//text()"
        ).get()

        if not parent or not section or not header:
            print("No parent or section or header found")
            return

        title = f"{section.strip()} - {parent.strip()} - {header.strip()}"

        print(f"Parsed {title} ({response.url})")

        d = {
            "title": title,
            "content": text,
            "url": response.url,
        }

        self.data.append(d)

        yield d


if __name__ == "__main__":
    from scrapy.crawler import CrawlerProcess

    process = CrawlerProcess()
    process.crawl(UmbrellaSpider)
    process.start()
