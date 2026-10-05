# Menomittari

Menomittari on kurssityönä toteutettava selainsovellus, joka auttaa ymmärtämään omaa rahankäyttöä. Se ryhmittelee menot, vertaa kahta ajanjaksoa ja näyttää, mikä kulutuksessa muuttui.

## Näin sovellusta käytetään

1. Tuo sovellukseen esimerkkitiedosto ja anna sen ajanjakso.
2. Tarkastele tapahtumia ja menoja ryhmittäin.
3. Tuo toinen jakso ja katso muutokset aiempaan verrattuna.
4. Lataa tarvittaessa varmuuskopio. Sen voi palauttaa tyhjään sovellukseen toisessa selaimessa.

Ensimmäinen versio käyttää vain keksittyjä tapahtumia ja yhtä sovittua taulukkomuotoista tekstitiedostoa (CSV). Se ei vielä lue pankkien omia tiliotteita eikä ole valmis oikeiden taloustietojen käsittelyyn.

## Missä tiedot säilyvät?

Tiedostot käsitellään ja taloushistoria tallennetaan omassa selaimessa. Tätä kutsutaan local-first-toteutukseksi. Tapahtumia ei lähetetä palvelimelle. Backend tallentaa erikseen vain käyttäjätilin ja kirjautumisistunnon tiedot.

Tiedot eivät siirry automaattisesti toiselle laitteelle. Selaimen sivustotietojen poistaminen voi poistaa historian, joten varmuuskopio kannattaa ladata. Kurssiversion varmuuskopio ei ole salattu.

## Projektin tila

P0-01–P0-04-vaiheet ovat valmiit. P0-05-vaiheen paikallinen CSV-tuonti ja kiinteä kauppiasluokittelu on toteutettu ja tarkistettavana. Tapahtumanäkymä ja analyysi lisätään myöhemmissä työvaiheissa.

## Kehitysympäristön käynnistäminen

Tarvitset Docker Desktopin tai muun ympäristön, jossa `docker compose` toimii. Node.js:ää, pnpm:ää tai Pythonia ei asenneta isäntäkoneelle. Siirry komentorivillä tähän `lopputyo/menomittari`-kansioon.

Rakenna frontendin ja backendin kehityskuvat. Komento asentaa lukitut JavaScript- ja Python-riippuvuudet konttien sisälle:

```powershell
docker compose build
```

Alusta tai päivitä backendin SQLite-tietokanta Alembic-migraatioilla:

```powershell
docker compose run --rm backend uv run --no-sync alembic upgrade head
```

Käynnistä sovellus:

```powershell
docker compose up
```

Avaa frontend selaimessa <http://127.0.0.1:5173>. Backendin toimintakunnon voi tarkistaa osoitteesta <http://127.0.0.1:8000/api/health> ja sen automaattisen rajapintakuvauksen osoitteesta <http://127.0.0.1:8000/docs>.

Kehitysympäristössä istuntoeväste käyttää `SameSite=Lax`-asetusta ja toimii paikallisen HTTP-yhteyden vuoksi ilman `Secure`-lippua. HTTPS-julkaisuympäristössä `MENOMITTARI_SESSION_COOKIE_SECURE` asetetaan arvoon `true`. `SameSite=None` hyväksytään vain yhdessä `Secure`-asetuksen kanssa.

Pysäytä sovellus näppäinyhdistelmällä `Ctrl+C` ja poista käynnistetyt kontit sekä projektiverkko:

```powershell
docker compose down
```

Vite seuraa lähdetiedostoja polling-menetelmällä, jotta muutokset välittyvät luotettavasti Windowsin Docker Desktop -liitoshakemiston läpi. Kun esimerkiksi `frontend/src/App.tsx` tallennetaan, avoimen selainikkunan pitäisi päivittyä ilman Docker-kuvan uudelleenrakennusta. Jos `vite.config.ts`-asetusta muutetaan palvelimen ollessa jo käynnissä, lataa asetus uudelleen komennolla `docker compose restart frontend`.

## Tarkistukset

Seuraavat komennot on todennettu Docker-konteissa. Ne eivät vaadi paikallista Node.js- tai Python-asennusta.

Backend:

```powershell
docker compose run --rm backend uv run --no-sync alembic upgrade head
docker compose run --rm backend uv run --no-sync pytest -W error
```

- `alembic upgrade head` suorittaa kaikki vielä ajamattomat tietokantamigraatiot.
- `pytest -W error` ajaa backendin testit ja käsittelee myös varoitukset virheinä.

Frontend:

```powershell
docker compose run --rm frontend pnpm test
docker compose run --rm frontend pnpm typecheck
docker compose run --rm frontend pnpm lint
docker compose run --rm frontend pnpm build
```

- `test` ajaa Vitest-testit kerran.
- `typecheck` tarkistaa TypeScript-tyypit tuottamatta tiedostoja.
- `lint` etsii tavallisia koodivirheitä Oxlintillä.
- `build` tekee tyyppitarkistuksen ja kokoaa julkaisutiedostot `frontend/dist`-kansioon.

Frontend-riippuvuuksien täsmälliset versiot ovat `frontend/package.json`- ja `frontend/pnpm-lock.yaml`-tiedostoissa. Backendin Python-riippuvuudet määritellään `backend/pyproject.toml`-tiedostossa ja lukitaan `backend/uv.lock`-tiedostoon. `uv` suoritetaan Docker-kontissa; `pip`:iä ei käytetä.

## Dokumentaatio

| Tiedosto | Sisältö |
| --- | --- |
| [Projektisuunnitelma](docs/project-plan.md) | Tavoite, kurssityön rajaus, aikataulu ja teknologiat |
| [Työlista](docs/backlog.md) | Toteutusjärjestys ja valmistumisen ehdot |
| [Arkkitehtuuri](docs/architecture.md) | Tekninen rakenne ja tallennus |
| [Aineisto ja laskenta](docs/data-contract.md) | Tiedostomuoto, laskentasäännöt ja testien odotusarvot |
| [Sovelluksen rajapinnat](docs/api.md) | Frontendin sisäiset toiminnot ja käyttäjätilien HTTP-rajapinta |
| [P0-01-oppituntimateriaali](docs/p0-01-oppituntimateriaali.md) | Ensimmäisen toteutusvaiheen työseloste ja käsitteet |
| [P0-02-oppituntimateriaali](docs/p0-02-oppituntimateriaali.md) | Backendin perustan työseloste ja käsitteet |
| [P0-03-oppituntimateriaali](docs/p0-03-oppituntimateriaali.md) | Käyttäjätilien ja palvelinpuolisten istuntojen työseloste |
| [P0-04-oppituntimateriaali](docs/p0-04-oppituntimateriaali.md) | IndexedDB:n, Dexien ja atomisen paikallistallennuksen työseloste |
| [P0-05-oppituntimateriaali](docs/p0-05-oppituntimateriaali.md) | CSV-tuonnin, validoinnin ja kauppiasluokittelun työseloste |
