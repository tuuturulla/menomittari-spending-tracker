# P0-02 – backendin perusta

Tämä työseloste kuvaa, mitä Menomittarin toisessa toteutusvaiheessa tehtiin, miksi ratkaisut tehtiin ja miten osat liittyvät toisiinsa. Vaiheen tarkoitus ei ollut vielä toteuttaa kirjautumista, vaan rakentaa sille testattu ja laajennettava palvelinpohja.

## Lopputulos

Projektissa on nyt kaksi erillistä käynnissä olevaa ohjelmaa:

```text
Selain
  │
  ├── http://127.0.0.1:5173 ──> Vite + React -frontend
  │
  └── http://127.0.0.1:8000 ──> FastAPI-backend
                                      │
                                      └── SQLAlchemy ──> SQLite
```

Frontend vastaa myöhemmin taloustietojen lukemisesta, laskennasta ja paikallisesta IndexedDB-tallennuksesta. Backend vastaa myöhemmin vain käyttäjätileistä ja kirjautumisistunnoista. CSV-tiedostoja tai tapahtumatietoja ei lähetetä backendille.

P0-02 toteutti seuraavat asiat:

- FastAPI-palvelimen omassa Docker-kontissa
- Python-riippuvuuksien hallinnan `uv`:lla
- SQLAlchemy-yhteyden SQLite-tietokantaan
- Alembic-migraatioiden perustan
- `GET /api/health` -rajapinnan
- rajatun CORS-asetuksen frontendille
- kaksi automaattista backend-testiä

## Vite ja FastAPI tekevät eri työtä

Vite on frontendin kehitystyökalu. Se käsittelee React- ja TypeScript-koodia, käynnistää kehityspalvelimen ja päivittää selainikkunan lähdekoodin muuttuessa.

FastAPI on Pythonilla kirjoitettu backend-framework. Se vastaanottaa HTTP-pyyntöjä, suorittaa palvelimen logiikkaa ja palauttaa HTTP-vastauksia. Tässä vaiheessa FastAPI tarjoaa vain health-reitin. P0-03 lisää käyttäjätilien reitit.

```text
Vite:    "Näytä ja päivitä käyttöliittymä selaimessa."
FastAPI: "Vastaanota pyyntö ja suorita palvelimen toiminto."
```

FastAPI ei korvaa Viteä eikä Vite korvaa FastAPIa. Docker Compose käynnistää ne saman projektin kahtena palveluna.

## Mitä HTTP-reitillä tarkoitetaan?

HTTP-reitti yhdistää menetelmän ja osoitepolun tiettyyn Python-funktioon:

```python
@router.get("/health")
def get_health(...):
    ...
```

Routerille on annettu etuliite `/api`, joten lopullinen osoite on:

```text
GET /api/health
```

Kun selain tai muu HTTP-asiakas pyytää tätä osoitetta, FastAPI kutsuu `get_health`-funktiota. Funktio tekee tietokannalle kevyen `SELECT 1` -kyselyn ja palauttaa onnistuessaan:

```json
{"status":"ok"}
```

Tämä tarkistaa kaksi asiaa samalla kertaa: HTTP-palvelin vastaa ja SQLAlchemy saa yhteyden tietokantaan.

## FastAPI-sovelluksen luominen

`app/main.py` sisältää `create_app`-funktion. Se kokoaa sovelluksen seuraavista osista:

1. ympäristökohtaiset asetukset
2. SQLAlchemy-tietokantamoottori
3. CORS-väliohjelmisto
4. health-router
5. tietokantayhteyksien sulkeminen palvelun pysähtyessä

Sovelluksen rakentaminen funktion sisällä helpottaa testaamista. Testi voi antaa sille oman asetuskokonaisuuden ja muistissa elävän SQLite-tietokannan muuttamatta varsinaista kehitystietokantaa.

## Asetukset ja ympäristömuuttujat

`app/config.py` lukee kaksi asetusta:

| Muuttuja | Tarkoitus |
| --- | --- |
| `MENOMITTARI_DATABASE_URL` | Kertoo SQLAlchemylle käytettävän tietokannan sijainnin. |
| `MENOMITTARI_CORS_ORIGIN` | Kertoo, mistä selainosoitteesta backend hyväksyy frontend-pyynnöt. |

Docker Compose antaa kehitysympäristössä arvot:

```text
sqlite+pysqlite:////data/menomittari.db
http://127.0.0.1:5173
```

Koodiin ei tarvitse kirjoittaa eri tietokantapolkua testiä tai myöhempää tuotantoympäristöä varten. Ympäristö antaa arvon, mutta ohjelman rakenne pysyy samana.

## SQLAlchemy ja SQLite

SQLite on tiedostoon tallentuva relaatiotietokanta. Tässä projektissa tiedosto säilyy Docker-volyymissa `/data`-hakemiston alla, joten kontin uudelleenluonti ei poista tietokantaa.

SQLAlchemy on Pythonin tietokantakerros. Se muodostaa tietokantayhteyden ja tarjoaa myöhemmin Python-luokat käyttäjä- ja istuntotauluille. P0-02:ssa SQLAlchemy suorittaa health-tarkistuksen; varsinaiset taulumallit lisätään P0-03:ssa.

`Engine` ei tarkoita yhtä jatkuvasti auki olevaa tietokantayhteyttä. Se hallitsee yhteyksien avaamista, käyttöä ja vapauttamista sovelluksen puolesta.

SQLite-yhteydelle asetettiin `check_same_thread=False`, koska FastAPI voi käsitellä synkronisia reittejä eri työskentelysäikeissä. `autocommit=False` tekee transaktioiden käyttäytymisestä nykyisen SQLAlchemy-suosituksen mukaista.

## Mitä migraatio tarkoittaa?

Migraatio on versionhallittu muutos tietokannan rakenteeseen. Alembic pitää kirjaa siitä, mitkä muutokset tietokantaan on jo suoritettu.

```text
0001_initialize_backend
        │
        └── seuraava migraatio voi lisätä users- ja sessions-taulut
```

Ensimmäinen migraatio ei vielä luo sovellustauluja. Se aloittaa migraatiohistorian ja luo Alembicin oman `alembic_version`-taulun. Käyttäjä- ja istuntotaulut kuuluvat P0-03:een.

Migraatiot suoritetaan komennolla:

```powershell
docker compose run --rm backend uv run --no-sync alembic upgrade head
```

- `docker compose run --rm backend` käynnistää väliaikaisen backend-kontin.
- `uv run --no-sync` käyttää Docker-kuvaan valmiiksi lukittua Python-ympäristöä.
- `alembic upgrade head` vie tietokannan uusimpaan tunnettuun migraatioversioon.

Migraation ajaminen uudelleen on turvallista: Alembic tunnistaa jo suoritetut revisiot eikä suorita niitä toistamiseen.

## Miksi käytetään uv:ta?

`backend/pyproject.toml` kertoo, mitä riippuvuuksia projekti tarvitsee. `backend/uv.lock` lukitsee niiden täsmälliset versiot ja aliriippuvuudet.

```text
pyproject.toml  ──> mitä riippuvuuksia sallitaan
uv.lock         ──> mitkä täsmälliset versiot asennetaan
```

Docker-kuva käyttää `uv sync --locked` -komentoa. Rakennus pysähtyy, jos `pyproject.toml` ja `uv.lock` eivät vastaa toisiaan. Näin kehitys- ja testiympäristö eivät valitse huomaamatta eri kirjasto-versioita. `pip`:iä ei käytetä.

Virallinen uv/Python-kuva on lukittu sekä versionumeroon että SHA-256-tiivisteeseen. Tällöin sama Dockerfile ei vaihda pohjakuvaa huomaamatta tagin muuttuessa.

## Dockerfilen rakennusjärjestys

Dockerfile kopioi ensin vain riippuvuustiedostot:

```dockerfile
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project
```

Vasta tämän jälkeen lähdekoodi kopioidaan kuvaan. Docker voi käyttää riippuvuuskerrosta välimuistista, kun Python-koodi muuttuu mutta riippuvuudet eivät muutu. Tämä nopeuttaa myöhempiä rakennuksia.

Virtuaaliympäristö sijaitsee kontin `/opt/venv`-hakemistossa. Kehityksen lähdekoodiliitos `/app` ei siksi peitä Docker-kuvaan asennettuja riippuvuuksia.

## Mikä CORS on?

Selain pitää eri portteja eri alkuperinä:

```text
http://127.0.0.1:5173  frontend
http://127.0.0.1:8000  backend
```

Vaikka osoitteen tietokoneosa on sama, portit ovat eri. Selain tarvitsee backendiltä luvan siihen, että portissa 5173 toimiva sivu saa lukea portin 8000 vastauksia.

CORS-asetus sallii täsmälleen kehitysfrontendin alkuperän. Yleismerkkiä `*` ei käytetä, koska myöhemmässä kirjautumisessa selain lähettää evästeitä. Automaattinen testi tarkistaa sekä sallitun että tuntemattoman alkuperän.

## Testit

Backendissä on kaksi testiä:

1. health-reitti palauttaa HTTP 200 -tilan ja täsmälleen `{"status":"ok"}`
2. CORS sallii määritetyn frontendin mutta ei tuntematonta alkuperää

Testit käyttävät muistissa elävää SQLite-kantaa:

```text
sqlite+pysqlite:///:memory:
```

Ne eivät koske Docker-volyymin kehitystietokantaan. `TestClient` käynnistetään `with`-lohkon sisällä, jotta FastAPI-sovelluksen käynnistys- ja sulkemisvaiheet suoritetaan myös testissä.

Testikomento on:

```powershell
docker compose run --rm backend uv run --no-sync pytest -W error
```

`-W error` muuttaa kirjastojen varoitukset testivirheiksi. Ensimmäisellä ajolla Starlette ilmoitti vanhan `httpx`-testiasiakkaan poistumisesta. Riippuvuus vaihdettiin Starletten nykyisin suosittelemaan `httpx2`:een, minkä jälkeen testit läpäisivät ilman varoituksia.

## Tiedostojen vastuut

| Tiedosto | Vastuu |
| --- | --- |
| `backend/Dockerfile` | Rakentaa lukitun Python- ja uv-ympäristön. |
| `backend/pyproject.toml` | Määrittelee Python-version ja suorat riippuvuudet. |
| `backend/uv.lock` | Lukitsee kaikki asennettavat versiot. |
| `backend/app/config.py` | Lukee tietokanta- ja CORS-asetukset. |
| `backend/app/main.py` | Kokoaa FastAPI-sovelluksen. |
| `backend/app/api/health.py` | Toteuttaa health-rajapinnan. |
| `backend/app/db/database.py` | Luo SQLAlchemy-moottorin. |
| `backend/app/db/base.py` | Tarjoaa yhteisen pohjan tuleville taulumalleille. |
| `backend/alembic.ini` | Alembicin pääasetukset. |
| `backend/migrations/` | Sisältää versionoidut tietokantamuutokset. |
| `backend/tests/test_health.py` | Tarkistaa health-reitin ja CORS-rajauksen. |
| `compose.yaml` | Käynnistää frontendin ja backendin yhdessä. |

## Tarkistetut tulokset

P0-02:n lopuksi tarkistettiin:

| Tarkistus | Tulos |
| --- | --- |
| Backendin Docker-kuvan puhdas rakennus | Onnistui |
| Alembic tyhjää SQLite-kantaa vasten | Revisio `0001` suoritettiin |
| Backendin Pytest | 2/2 läpäisi ilman varoituksia |
| Oikea HTTP-pyyntö | `200` ja `{"status":"ok"}` |
| CORS-otsake | `http://127.0.0.1:5173` |
| Frontendin regressiot | Testi, tyyppitarkistus, linttaus ja build läpäisivät |

## Mitä tässä vaiheessa ei tehty?

P0-02 ei toteuttanut:

- käyttäjä- tai istuntotauluja
- rekisteröitymistä
- kirjautumista tai uloskirjautumista
- salasanojen käsittelyä
- CSRF-suojausta
- taloustietojen lähettämistä palvelimelle

Nämä rajat pitävät vaiheen pienenä ja testattavana. P0-03 rakentaa käyttäjätilit nyt valmistuneen tietokanta-, migraatio- ja HTTP-pohjan päälle.

## Kokeile itse

1. Rakenna ympäristö komennolla `docker compose build`.
2. Aja migraatiot komennolla `docker compose run --rm backend uv run --no-sync alembic upgrade head`.
3. Käynnistä palvelut komennolla `docker compose up`.
4. Avaa <http://127.0.0.1:8000/api/health> ja tarkista JSON-vastaus.
5. Avaa <http://127.0.0.1:8000/docs> ja katso FastAPI:n muodostamaa rajapintakuvausta.
6. Aja backend-testit komennolla `docker compose run --rm backend uv run --no-sync pytest -W error`.
7. Pysäytä palvelut `Ctrl+C`:llä ja suorita `docker compose down`.

## Lähteet

- [FastAPI: Docker-kontit](https://fastapi.tiangolo.com/deployment/docker/)
- [uv: käyttäminen Dockerissa](https://docs.astral.sh/uv/guides/integration/docker/)
- [SQLAlchemy: SQLite](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html)
- [Alembic: migraatioiden perusteet](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
- [Starlette: TestClient](https://www.starlette.io/testclient/)
