import json
import scrapy
from scrapy.http import HtmlResponse


class DuoSpider(scrapy.Spider):
    name = "duo"
    allowed_domains = ["duo.com"]
    start_urls = ["https://duo.com/docs"]

    def __init__(self, name=None, **kwargs):
        super().__init__(name, **kwargs)

        self.data = []

    def closed(self, reason):
        filename = f"data/queue/docs/{self.name}.json"
        with open(filename, "w") as f:
            json.dump(self.data, f)

        self.log(f"Saved file {filename}!")

    def parse(self, response: HtmlResponse):
        links = response.css("#list_introduction > ul > a.index-link")
        print(links)
        for link in links:
            # get href attribute
            href = link.attrib["href"]

            # check if the link is relative
            if not href.startswith("http"):
                href = f"https://duo.com{href}"

            yield response.follow(href, callback=self.parse_chapter)

    def parse_chapter(self, response: HtmlResponse):
        data = []
        # header get all text content even from nested tags
        title = response.css("div.content h1::text").get()
        sections = response.css("div.content h2")

        all_text = ""

        for section in sections:
            # get all text content even from nested tags
            header = section.css("*::text").get()
            # get all text in article
            text = section.xpath("following-sibling::p/node()").getall()
            # merge all text into one string
            text = " ".join([text.strip() for text in text if text.strip()])

            if not header or not text:
                print("No header or text found")
                return

            id = header.lower().replace(" ", "-")

            if not title:
                print("No title found")
                continue

            title = title.replace("\xa0", " ")
            text = text.replace("\xa0", " ")

            all_text += text + "\n\n"

        self.data.append(
            {
                "title": title,
                "content": all_text,
                "url": response.url,
            }
        )

        data.append(
            {
                "title": title,
                "content": all_text,
                "url": response.url,
            }
        )

        return data


if __name__ == "__main__":
    from scrapy.crawler import CrawlerProcess

    process = CrawlerProcess()
    process.crawl(DuoSpider)
    process.start()
