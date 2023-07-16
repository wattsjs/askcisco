import json
import logging
import requests


def main():
    headers = {
        "authority": "sgnrpupouvethisq3xlnzebkeq.appsync-api.us-east-1.amazonaws.com",
        "authorization": "EVENT ODPrdfW9v5Q1Yq9MFZPrD OVERRIDE 18957aa14c7b23-0df408ec070b34-1b525634-1fa400-18957aa14c8661",
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "deviceid": "18957aa14c7b23-0df408ec070b34-1b525634-1fa400-18957aa14c866a",
        "distinctid": "KspzD3wSA2EABilXBTeHC",
        "dnt": "1",
        "eventid": "ODPrdfW9v5Q1Yq9MFZPrD",
        "origin": "https://www.ciscolive.com",
        "referer": "https://www.ciscolive.com/",
        "sec-ch-ua": '"Not.A/Brand";v="8", "Chromium";v="114"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sessionid": "",
        "type": "API_KEY",
    }

    pdfs = []

    page = 1

    while True:
        json_data = {
            "operationName": "search",
            "variables": {
                "itemType": "session",
                "source": "session",
                "type": "SEARCH",
                "enableSimpleSearch": False,
                "searchParams": {
                    "facetFilters": [
                        [
                            "categories.lvl1:Technology > Security",
                        ],
                        [
                            "categories.lvl1:Session Type > Breakout",
                            "categories.lvl1:Session Type > Breakouts",
                            "categories.lvl1:Session Type > DevNet",
                            "categories.lvl1:Session Type > Keynote",
                            "categories.lvl1:Session Type > Innovation Talk",
                            "categories.lvl1:Session Type > On-Demand Session",
                            "categories.lvl1:Session Type > Technical Solutions Clinic",
                            "categories.lvl1:Session Type > Technical Assistance Center",
                            "categories.lvl1:Session Type > Tech Circle",
                            "categories.lvl1:Session Type > Product or Strategy Overview",
                        ],
                        [
                            "categories.lvl1:Language > English",
                        ],
                        [
                            "categories.lvl1:Event > 2023 Las Vegas",
                        ],
                    ],
                    "facets": "",
                    "filters": "",
                    "page": page,
                    "query": "",
                },
            },
            "query": "query search($itemType: SearchItemType!, $searchParams: SearchInput, $source: SearchSource!, $type: SearchType!, $enableSimpleSearch: Boolean) {\n  search(\n    itemType: $itemType\n    searchParams: $searchParams\n    source: $source\n    type: $type\n    enableSimpleSearch: $enableSimpleSearch\n  )\n}",
        }

        response = requests.post(
            "https://sgnrpupouvethisq3xlnzebkeq.appsync-api.us-east-1.amazonaws.com/graphql",
            headers=headers,
            json=json_data,
        )
        data = response.json()
        sessions = json.loads(data["data"]["search"])
        for session in sessions["sessions"]:
            # get the title
            if "title" not in session:
                continue
            title = session["title"]
            title = title.replace(" – ", " - ")
            # get the code
            code = title.rsplit(" - ", 1)[-1]

            pdf_url = f"https://www.ciscolive.com/c/dam/r/ciscolive/global-event/docs/2023/pdf/{code}.pdf"

            d = {
                "source": pdf_url,
            }

            if "displayCategories" not in session:
                continue

            for k, v in session["displayCategories"].items():
                d[k.lower()] = v
            d["title"] = title
            d["subtitle"] = "Cisco Live " + session["displayCategories"]["Event"][0]

            pdfs.append(d)

        if sessions["totalPages"] == page:
            break

        page += 1

    # read existing data from data/queue/pdfs.json
    # add new data to existing data
    # write data to data/queue/pdfs.json
    try:
        with open("pipeline/data/queue/pdfs.json", "r") as f:
            existing_data = json.loads(f.read())
            existing_data.extend(pdfs)
    except FileNotFoundError:
        existing_data = pdfs
    with open("pipeline/data/queue/pdfs.json", "w") as f2:
        f2.write(json.dumps(existing_data, indent=2))

    logging.info(f"found {len(pdfs)} pdfs")


if __name__ == "__main__":
    main()
