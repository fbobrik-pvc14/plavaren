#!/usr/bin/env python3
"""Zaznamenanie verejne zobrazenej obsadenosti; iba štandardná knižnica."""
import argparse
import csv
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
import time
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

URL = 'https://www.petrzalka.sk/plavaren/'
FIELDS = ['timestamp_utc', 'timestamp_bratislava', 'occupancy', 'status', 'error', 'source_url']

class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.hidden += 1
        if not self.hidden:
            self.parts.append(' ')

    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self.hidden:
            self.hidden -= 1
        if not self.hidden:
            self.parts.append(' ')

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def parse_occupancy(html):
    parser = VisibleText()
    parser.feed(html)
    text = ' '.join(' '.join(parser.parts).split())
    values = {int(v) for v in re.findall(r'\bPlaváreň\s*:\s*(\d+)\s*(?:osôb|osoby|osoba)\b', text, re.IGNORECASE)}
    if len(values) != 1:
        raise ValueError('Obsadenosť chýba alebo stránka obsahuje protichodné hodnoty.')
    return values.pop()


def fetch_occupancy():
    request = Request(URL, headers={'User-Agent': 'PlavarenMonitor/1.0 (public occupancy; every 10 minutes)', 'Cache-Control': 'no-cache'})
    last_error = None
    for attempt in range(3):
        try:
            with urlopen(request, timeout=30) as response:
                html = response.read().decode(response.headers.get_content_charset() or 'utf-8')
            return parse_occupancy(html)
        except Exception as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(5 * (attempt + 1))
    raise RuntimeError(str(last_error)) from last_error


def append_row(path, occupancy='', error='', now=None):
    now = now or datetime.now(timezone.utc)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    exists = path.exists() and path.stat().st_size > 0
    if exists:
        with path.open(encoding='utf-8', newline='') as handle:
            if next(csv.reader(handle)) != FIELDS:
                raise ValueError('CSV má neočakávanú hlavičku; pôvodné dáta sa neprepísali.')
    with path.open('a', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        if not exists:
            writer.writeheader()
        writer.writerow(dict(zip(FIELDS, [now.astimezone(timezone.utc).isoformat(timespec='seconds'), now.astimezone(ZoneInfo('Europe/Bratislava')).isoformat(timespec='seconds'), occupancy, 'error' if error else 'ok', error, URL])))


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument('--output', default='data/occupancy.csv')
    options = args.parse_args()
    try:
        occupancy = fetch_occupancy()
    except Exception as exc:
        message = str(exc).replace('\n', ' ')[:500]
        append_row(options.output, error=message)
        print('Meranie zlyhalo: ' + message, file=sys.stderr)
        return 1
    append_row(options.output, occupancy=occupancy)
    print(f'Obsadenosť: {occupancy} osôb. Záznam uložený do {options.output}.')
    return 0

if __name__ == '__main__':
    sys.exit(main())
