import json
import scrapy
from scrapy.http import HtmlResponse


class CiscoDocsSpider(scrapy.Spider):
    allowed_domains = ["www.cisco.com"]

    def __init__(self, name, url, versions=None, products=None, *args, **kwargs):
        self.start_urls = [url]
        self.name = name
        self.product = products if products else []
        self.version = versions if versions else []

        super().__init__(*args, **kwargs)

        self.data = []

    def closed(self, reason):
        filename = f"data/queue/docs/{self.name}-{self.version[0]}.json"
        with open(filename, "w") as f:
            json.dump(self.data, f)

        self.log(f"Saved file {filename}!")

    def parse(self, response: HtmlResponse):
        # get all links under ul#bookToc
        links = response.css("div#pageContentDiv ul#bookToc a")

        for link in links:
            # get href attribute
            href = link.attrib["href"]

            # check if the link is relative
            if not href.startswith("http"):
                href = f"https://www.cisco.com{href}"

            data = response.follow(href, callback=self.parse_chapter)
            yield data

    def parse_chapter(self, response: HtmlResponse):
        data = []

        title = response.css("h2.chapter-title::text").getall()
        title = " ".join([title.strip() for title in title if title.strip()])
        title = title.replace("\r", "").replace("\t", "").replace("\n", " ")
        title = " ".join(title.split())

        # get all article.nested1 nodes
        articles = response.css("article.nested1")

        text_data = ""

        for article in articles:
            if "id" not in article.attrib:
                continue
            article_id = article.attrib["id"]

            # header get all text content even from nested tags
            header = article.css("h2::text").getall()
            header = " ".join([header.strip() for header in header if header.strip()])
            header = header.replace("\r", "").replace("\t", "").replace("\n", " ")
            header = " ".join(header.split())

            # get all text in article
            text = article.css("::text").getall()
            # merge all text into one string
            text = " ".join([text.strip() for text in text if text.strip()])

            # strip consecutive spaces and newlines
            header = header.replace("\r", "").replace("\t", "").replace("\n", " ")
            header = " ".join(header.split())

            text = text.replace("\r", "").replace("\t", "").replace("\n", " ")
            text = " ".join(text.split())

            text_data += "\n\n" + text

        main_title = response.css("h1#fw-pagetitle::text").get()
        if main_title:
            subtitle = title.strip()
            title = main_title.strip()
        else:
            subtitle = None

        d = {
            "products": self.product,
            "versions": self.version,
            "title": title.strip(),
            "subtitle": subtitle,
            "content": text_data,
            "url": response.url,
        }

        data.append(d)

        self.data.append(d)

        yield {"data": data}
