# Sledovanie obsadenosti Petržalskej plavárne

Projekt načíta https://www.petrzalka.sk/plavaren/ každých 10 minút cez GitHub Actions a pridá meranie do `data/occupancy.csv`. Po nastavení nemusí byť počítač ani mobil zapnutý. Netreba heslo k plavárni, vlastný server ani API kľúč.

## 1. Rozbaľte ZIP a vytvorte repozitár

1. Stiahnite a rozbaľte `plavaren-monitor-10min.zip`.
2. Prihláste sa na https://github.com a cez **New repository** vytvorte repozitár, napríklad `plavaren-monitor`. Pridajte úvodný README, aby vznikla predvolená vetva (zvyčajne `main`).
3. Verejný repozitár sprístupní aj namerané údaje všetkým. Pri súkromnom repozitári skontrolujte limity a účtovanie GitHub Actions vo svojom účte.
4. Otvorte repozitár → **Add file → Upload files**. Nahrajte obsah rozbaleného priečinka `plavaren-monitor`, nie ZIP ani nadradený priečinok. Potvrďte cez **Commit changes**. Súbor `monitor.py` musí byť priamo v koreni repozitára.

### Pozor na skrytý priečinok `.github`

Tento priečinok obsahuje automatizáciu a pri bežnom nahrávaní sa môže vynechať. Na Macu zobrazíte skryté súbory skratkou **Cmd + Shift + .**. Ak priečinok nenahráte, vytvorte súbor cez **Add file → Create new file**:

- Do názvu zadajte presne `.github/workflows/monitor.yml`.
- Vložte celý obsah rovnomenného súboru z rozbaleného ZIPu a uložte ho do predvolenej vetvy.

Výsledná štruktúra musí byť:

```
.github/workflows/monitor.yml
monitor.py
README.md
OVERENIE.txt
.gitignore
data/occupancy.csv
tests/test_monitor.py
```

Na mobile môžete použiť web GitHubu (prípadne režim stránky pre počítač), rozbaliť ZIP v aplikácii Súbory a súbory nahrať. Úvodné nastavenie je pohodlnejšie na počítači; ďalšie sledovanie a sťahovanie CSV zvládnete v mobilnom prehliadači.

## 2. Povoľte a overte automatizáciu

1. Otvorte **Settings → Actions → General**. Actions musia byť povolené. V časti **Workflow permissions** povoľte **Read and write permissions**, ak je to potrebné. Workflow sám žiada `contents: write`; pravidlá organizácie môžu zápis obmedziť.
2. Otvorte kartu **Actions** a prípadne potvrďte zapnutie workflowov.
3. Vyberte **Obsadenosť plavárne → Run workflow**, ponechajte predvolenú vetvu a spustite ho.
4. Po dokončení otvorte `data/occupancy.csv`: pod hlavičkou má pribudnúť riadok so stavom `ok` a počtom osôb. V repozitári má pribudnúť aj commit od `github-actions[bot]`.
5. Ďalšie behy sú plánované na 7., 17., 27., 37., 47. a 57. minútu každej hodiny, celý deň aj noc. Posun mimo celej hodiny znižuje riziko preťaženia plánovača.

GitHub Actions negarantuje presný interval: behy sa môžu oneskoriť alebo vynechať. Zapisuje sa skutočný čas získania hodnoty, nie plánovaný čas. Zmeškané merania sa spätne nedopĺňajú. Vo verejných repozitároch GitHub môže vypnúť plánovanie po 60 dňoch bez aktivity; stav občas skontrolujte v Actions. Workflow musí byť na predvolenej vetve.

## 3. Stiahnutie a význam dát

Otvorte `data/occupancy.csv` a použite **Download raw file**. Záložnú kópiu nájdete aj v detaile každého behu Actions v časti **Artifacts**, dostupnú 30 dní. Hlavná história je uložená v repozitári a týmto časovým limitom sa nemaže.

CSV je UTF-8, stĺpce sú oddelené čiarkou. V Exceli ho podľa potreby importujte cez **Údaje → Z textu/CSV**, s kódovaním UTF-8 a oddeľovačom čiarka.

| Stĺpec | Význam |
| --- | --- |
| timestamp_utc | Skutočný čas merania v UTC |
| timestamp_bratislava | Rovnaký okamih v Europe/Bratislava vrátane letného/zimného posunu |
| occupancy | Počet osôb uvedený pri „Plaváreň“; pri chybe prázdne |
| status | `ok` alebo `error` |
| error | Popis chyby, pri úspechu prázdne |
| source_url | Zdrojová stránka |

Skript má 30-sekundový limit sieťovej požiadavky a najviac tri pokusy. Ak načítanie zlyhá alebo údaj chýba či si jeho dve zobrazenia odporujú, uloží chybu bez vymyslenej nuly a beh označí ako neúspešný. Hodnoty nad 160 neodmieta: prevádzkovateľ upozorňuje, že počítadlo môže započítať aj hostí v šatniach. Počet v saune sa nezamieňa s počtom v plavárni.

Čas merania označuje načítanie webu. Stránka nezverejňuje v tomto údaji čas poslednej aktualizácie počítadla; skript nevie potvrdiť čerstvosť samotného počítadla. Nejde o historické dáta, zber začne až spustením projektu.

## 4. Vyhodnotenie po týždni

Po siedmich celých dňoch si stiahnite CSV. Pri ideálnom priebehu ide o približne 1 008 meraní plus ručné spustenia. Použite len riadky `status=ok`, zohľadnite výpadky a vyraďte časy mimo skutočných otváracích hodín. Web pri príprave projektu uvádzal 6:00–22:00, no sviatky, odstávky a zmeny si overte. Nočná nula nie je odporúčanie na návštevu.

Porovnávajte dni a polhodinové časové pásma podľa bratislavského času; užitočné sú priemer, medián a počet meraní. Jeden týždeň dá len orientačný obraz: pre každý deň v týždni existuje iba jedna návšteva daného časového pásma. Spoľahlivejší obraz získate za viac týždňov. Skript automatické týždenné vyhodnotenie neposiela; CSV môžete poskytnúť na analýzu.

## Riešenie problémov a zastavenie

- **Nevidím Run workflow:** skontrolujte cestu `.github/workflows/monitor.yml`, predvolenú vetvu a povolenie Actions.
- **Zápis zlyhal s 403 alebo ochranou vetvy:** skontrolujte oprávnenie zápisu a pravidlá repozitára. Pre projekt je najjednoduchší samostatný repozitár, ktorý povoľuje zápis botovi. CSV z neúspešného behu môže byť stále dostupné ako Artifact.
- **Konflikt pri zápise:** workflow neprepisuje cudzie commity silou. Stiahnite zálohu z Artifacts a spustite nové meranie. Starý neuložený riadok sa automaticky neobnoví.
- **Stav error:** otvorte príslušný beh v Actions a stĺpec `error`. Pri zmene štruktúry stránky môže byť potrebné upraviť parser.
- **Chýbajú merania:** skontrolujte stav Actions, limity účtu a oneskorenia plánovača.
- **Zastavenie:** Actions → Obsadenosť plavárne → menu s tromi bodkami → **Disable workflow**. Doterajšie CSV zostane uložené.

## Voliteľné lokálne spustenie

Python 3.9 alebo novší; na GitHube je nastavený Python 3.12. V termináli otvorte rozbalený priečinok projektu a spustite:

```sh
python3 -m unittest discover -s tests -v
python3 monitor.py
```

Netreba inštalovať žiadne balíčky na GitHub runneri. Lokálne musí byť dostupná systémová databáza časových pásiem (bežná na macOS a Linuxe; vo Windows môže byť potrebný balík `tzdata`). Lokálny príkaz vykoná jedno meranie; pravidelné spúšťanie zabezpečuje GitHub Actions.

## Zdroje

- Zdroj meraní a vysvetlenie počítadla: https://www.petrzalka.sk/plavaren/
- GitHub, plánovanie a obmedzenia: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule

Projekt pripravený a lokálne overený 25. 10. 2026. Podrobnosti sú v `OVERENIE.txt`.

## Budúci súkromný web

CSV obsahuje históriu aj posledné úspešné meranie. Web môže zobrazovať poslednú známu obsadenosť s časom merania, časový graf a porovnanie dní či hodín. Pri výpadku musí uviesť zastaranosť údaja; posledné meranie nie je záruka aktuálneho stavu v reálnom čase. Priemerovanie a odporúčania majú zohľadniť otváracie hodiny a chýbajúce merania.

Zber dát môže pokračovať nezávisle od webu. Pri súkromnom GitHub repozitári má údaje načítavať serverová časť webu; prístupový token nesmie byť vo verejnom kóde prehliadača. Konkrétne riešenie prístupu a hostingu vyberieme pri tvorbe webu.

Ak ste už nahrali staršiu verziu, aktualizujte iba `.github/workflows/monitor.yml`, `monitor.py` a dokumentáciu. Existujúci `data/occupancy.csv` nenahrádzajte prázdnym súborom zo ZIPu, aby zostala zachovaná história.
