# P0-03: käyttäjätilit ja istunnot – työseloste ja oppituntimateriaali

## Tavoite ja lopputulos

Tässä vaiheessa Menomittariin lisättiin käyttäjätilin luominen, kirjautuminen, kirjautumistilan tarkistus ja uloskirjautuminen. Backend tallentaa käyttäjän ja istunnon, mutta taloustiedot eivät edelleenkään siirry palvelimelle. Myöhemmissä vaiheissa ne tallennetaan selaimen IndexedDB-tietokantaan käyttäjätunnuksen perusteella eroteltuina.

Vaiheen tärkein oppimistavoite on ymmärtää, että käyttäjätunnus, salasana ja istunto ovat kolme eri asiaa:

- sähköposti tunnistaa käyttäjätilin;
- salasana todistaa kirjautumishetkellä, että käyttäjä tuntee salaisuuden;
- istunto todistaa seuraavissa pyynnöissä, että kirjautuminen on jo onnistunut.

## Kokonaisuus yhdellä silmäyksellä

```text
React-lomake
    │ sähköposti + salasana
    ▼
frontend/src/auth-api.ts
    │ HTTPS/HTTP-pyyntö, credentials: "include"
    ▼
FastAPI /api/auth
    ├─ CSRF- ja Origin-tarkistus
    ├─ Argon2id-salasanatarkistus
    ├─ kirjautumisyritysten rajoitus
    ▼
SQLAlchemy
    ├─ users: käyttäjä ja salasanatiiviste
    └─ sessions: istuntotunnisteen tiiviste ja voimassaoloaika
```

Selain säilyttää varsinaisen istuntotunnisteen `HttpOnly`-evästeessä. React ei voi lukea sitä JavaScriptillä. Backend saa evästeen automaattisesti selaimen seuraavissa pyynnöissä ja etsii sitä vastaavan tiivisteen tietokannasta.

## Toteutusjärjestys

1. Käyttäjä- ja istuntotaulut kuvattiin SQLAlchemy-malleina.
2. Alembic-migraatio `0002` lisättiin luomaan taulut ja indeksit.
3. Salasanan hajautus, istuntotunnisteet ja kirjautumisrajoitus toteutettiin palvelukerrokseen.
4. FastAPIin lisättiin CSRF-, rekisteröinti-, kirjautumis-, käyttäjä- ja uloskirjautumisreitit.
5. Backendille kirjoitettiin turvallisuuden hyväksymisehtoja tarkistavat testit.
6. Frontendiin lisättiin rajattu käyttäjätilinäkymä ja HTTP-asiakas.
7. Frontendin renderöinti, pyyntöjen asetukset, tyypit, linttaus ja tuotantokooste tarkistettiin.

## Mitä tietokantaan tallennetaan?

`users`-taulussa ovat:

- satunnainen UUID-tunniste;
- pieniksi kirjaimiksi normalisoitu yksilöllinen sähköposti;
- Argon2id-salasanatiiviste;
- tilin luontiaika UTC-ajassa.

`sessions`-taulussa ovat:

- istuntotunnisteen SHA-256-tiiviste pääavaimena;
- viite käyttäjään;
- luonti- ja vanhenemisaika.

Selväkielistä salasanaa tai raakaa istuntotunnistetta ei tallenneta tietokantaan. Käyttäjän poistaminen poistaisi viiteavaimen ja cascade-säännön avulla myös hänen istuntonsa.

## Miksi salasana hajautetaan Argon2id:llä?

Hajautus ei ole salaus. Salausta vastaava avain voisi palauttaa alkuperäisen tekstin, mutta salasanatiivisteestä salasanaa ei ole tarkoitus voida palauttaa. Kirjautumisessa kirjasto vertaa annettua salasanaa tallennettuun tiivisteeseen.

Argon2id on tarkoituksella hidas ja muistia käyttävä salasanahajautus. Se tekee suuren salasanalistan kokeilemisesta hyökkääjälle kalliimpaa. Tavallinen nopea SHA-256 sopii satunnaisen istuntotunnisteen tiivistämiseen, mutta ei käyttäjän valitseman salasanan suojaamiseen.

## Rekisteröitymisen kulku

1. Käyttäjä kirjoittaa sähköpostin ja vähintään 12-merkkisen salasanan.
2. Frontend hakee CSRF-tunnisteen ja lähettää tiedot `POST /api/auth/register` -pyynnössä.
3. Pydantic tarkistaa kenttien muodot ja estää ylimääräiset kentät.
4. Sähköposti normalisoidaan, jotta esimerkiksi `Test@Example.com` ja `test@example.com` eivät tee kahta tiliä.
5. Salasana hajautetaan Argon2id:llä ja käyttäjä tallennetaan.
6. Vastauksena palautetaan vain `id`, normalisoitu `email` ja `created_at`.

Rekisteröinti ei tässä versiossa kirjaa käyttäjää automaattisesti sisään. Näin tilin luominen ja kirjautuminen näkyvät koodissa kahtena erillisenä tapahtumana.

## Kirjautumisen kulku

1. Backend tarkistaa pyynnön alkuperän ja CSRF-tunnisteen.
2. Kirjautumisrajoitus tarkistaa sähköposti–IP-yhdistelmän epäonnistumiset.
3. Käyttäjä haetaan normalisoidulla sähköpostilla.
4. Salasana tarkistetaan Argon2id-kirjastolla. Myös puuttuvalle käyttäjälle tehdään raskas vertailu, jotta vastausaika ei paljasta helposti tilin olemassaoloa.
5. Backend luo kryptografisesti satunnaisen istuntotunnisteen.
6. Tunnisteen SHA-256-tiiviste tallennetaan `sessions`-tauluun.
7. Raaka tunniste annetaan selaimelle `HttpOnly`-evästeessä.
8. Frontend saa vastauksessa vain käyttäjän julkiset tiedot.

Jos sähköposti tai salasana on väärä, vastaus on kummassakin tilanteessa sama. Kun sallittu määrä epäonnistumisia täyttyy, backend palauttaa tilapäisesti tilakoodin `429 Too Many Requests` ja `Retry-After`-otsakkeen.

## Miten seuraava pyyntö tunnistetaan?

Frontend kutsuu `GET /api/auth/me` -reittiä asetuksella `credentials: "include"`. Selain liittää istuntoevästeen pyyntöön. Backend tiivistää saadun tunnisteen, hakee saman tiivisteen tietokannasta ja tarkistaa vanhenemisajan.

Tämä ero on tärkeä:

```text
React tietää: käyttäjän id ja sähköposti
Selain tietää: salainen istuntoeväste
Backend tietää: istunnon tiiviste, käyttäjä ja voimassaoloaika
```

Istuntotunnistetta ei kirjoiteta `localStorageen`, `sessionStorageen` tai IndexedDB:hen. `HttpOnly` vaikeuttaa tunnisteen varastamista sivulla suoritettavalla JavaScriptillä.

## Mikä CSRF on ja miksi se tarkistetaan?

Selain voi lähettää evästeen automaattisesti myös silloin, kun pyynnön käynnisti toinen sivusto. Tätä voidaan käyttää hyväksi CSRF-hyökkäyksessä. Menomittari käyttää kaksinkertaista tunnistetta:

1. frontend hakee satunnaisen CSRF-tunnisteen;
2. backend asettaa saman arvon CSRF-evästeeseen;
3. frontend lähettää arvon `X-CSRF-Token`-otsakkeessa;
4. backend vaatii otsakkeen ja evästeen täsmäävän sekä `Origin`-osoitteen olevan sallittu frontend.

Vieraan sivuston JavaScript ei selaimen same-origin-säännön vuoksi pysty lukemaan sallittua vastausta ja muodostamaan oikeaa otsaketta.

## Evästeen tärkeät asetukset

| Asetus | Tehtävä |
| --- | --- |
| `HttpOnly` | Estää frontendin JavaScriptiä lukemasta istuntotunnistetta. |
| `SameSite` | Rajoittaa evästeen lähettämistä sivustojen välisissä tilanteissa. |
| `Secure` | Sallii evästeen lähettämisen vain HTTPS-yhteydellä. |
| `Max-Age` | Määrittää selaimessa istunnon enimmäiskeston. |
| `Path=/api/auth` | Rajaa evästeen vain tunnistautumisrajapinnan poluille. |

Paikallinen kehitys käyttää HTTP:tä, joten `Secure=false` ja `SameSite=Lax`. Oikeassa HTTPS-julkaisussa `Secure` otetaan käyttöön. Sovellus estää vaarallisen yhdistelmän `SameSite=None` ja `Secure=false`.

## React ja TypeScript Python-osaajan näkökulmasta

| TypeScript/React | Läheinen Python-ajatus | Merkitys tässä vaiheessa |
| --- | --- | --- |
| `interface PublicUser` | dataluokka tai tyyppivihjeillä kuvattu sanakirja | Kuvaa backendiltä sallitut käyttäjäkentät. |
| `useState` | muuttuja, jonka muutos päivittää näkymän | Säilyttää kirjautuneen käyttäjän ja lomakkeen tilan. |
| `useEffect` | käynnistyksessä ajettava funktio | Tarkistaa sivun avauksessa olemassa olevan istunnon. |
| `async` / `await` | Pythonin `async` / `await` | Odottaa HTTP-pyynnön valmistumista pysäyttämättä koko selainta. |
| `try` / `catch` / `finally` | `try` / `except` / `finally` | Näyttää virheen ja vapauttaa lomakkeen uutta yritystä varten. |
| `FormEvent<HTMLFormElement>` | funktion parametrin tyyppivihje | Kertoo, millainen selaintapahtuma funktiolle tulee. |
| ehdollinen JSX | Pythonin ehtolause näkymää muodostettaessa | Näyttää joko lomakkeen tai kirjautuneen käyttäjän. |

`auth-api.ts` vastaa Python-projektin rajapinta-asiakasta: se keskittää URL-osoitteet, evästeasetuksen, JSON-käsittelyn, CSRF-tunnisteen ja virheiden muodon. `App.tsx` päättää, mitä käyttäjälle näytetään, mutta sen ei tarvitse tuntea HTTP:n kaikkia yksityiskohtia.

## Testit ja mitä ne todistavat

Backend-testit tarkistavat:

- sähköpostin normalisoinnin ja saman sähköpostin hylkäyksen;
- Argon2id-tiivisteen sekä sen, ettei salasana näy vastauksessa tai tietokannassa;
- yleisen virheilmoituksen sekä kirjautumisyritysten rajoituksen;
- istuntotunnisteen tiivistämisen, `HttpOnly`-, `SameSite`- ja `Secure`-asetukset;
- kirjautumistilan lukemisen;
- CSRF-suojauksen ja uloskirjautumisen tekemän istunnon mitätöinnin.

Frontend-testit tarkistavat, että käyttäjätilinäkymä renderöityy, pyynnöt käyttävät `credentials: "include"` -asetusta ja rekisteröinti hakee ensin CSRF-tunnisteen. Tyyppitarkistus, linttaus ja tuotantokooste tarkistavat lisäksi koko frontend-ketjun.

## Tarkistusten tulokset

| Tarkistus | Tulos |
| --- | --- |
| Docker-kuvien rakentaminen | Frontend- ja backend-kuvat rakentuivat onnistuneesti |
| Alembic tyhjään väliaikaiseen tietokantaan | Migraatiot `0001` ja `0002` suoritettiin onnistuneesti |
| Backendin Pytest | 9 testiä läpäisi, myös varoitukset käsiteltiin virheinä |
| Frontendin Vitest | 2 testitiedostoa ja 3 testiä läpäisi |
| TypeScript-tyyppitarkistus | Onnistui ilman virheitä |
| Oxlint | 0 varoitusta ja 0 virhettä |
| Viten tuotantokooste | Onnistui |

## Kokeile ja seuraa itse

1. Aja migraatio komennolla `docker compose run --rm backend uv run --no-sync alembic upgrade head`.
2. Käynnistä palvelut komennolla `docker compose up`.
3. Avaa <http://127.0.0.1:5173> ja luo käyttäjätili vähintään 12-merkkisellä salasanalla.
4. Kirjaudu sisään samalla sähköpostilla eri kirjainkokoa käyttäen. Näkymän pitäisi näyttää normalisoitu sähköposti.
5. Päivitä sivu. `GET /api/auth/me` tunnistaa edelleen voimassa olevan istunnon.
6. Avaa selaimen kehitystyökalujen Storage- tai Application-näkymä. Istuntoeväste näkyy nimeltä, mutta `HttpOnly` estää sovelluskoodia lukemasta sen arvoa.
7. Kirjaudu ulos ja päivitä sivu. Suojatun käyttäjätiedon ei enää pidä palautua.
8. Kokeile väärää salasanaa useita kertoja ja huomaa tilapäinen yritysrajoitus.

Käytä kokeessa vain keksittyä sähköpostia ja salasanaa. Kurssiversiota ei ole tarkoitettu oikeille tunnuksille tai taloustiedoille.

## Mitä tässä vaiheessa ei tehty?

P0-03 ei lisää sähköpostivahvistusta, salasanan palautusta, monivaiheista tunnistautumista, käyttäjän poistamista tai taloustietojen pilvitallennusta. Muistissa toimiva kirjautumisrajoitus sopii yhden backend-prosessin kurssiversioon; usean palvelinprosessin julkaisu tarvitsee yhteisen rajoitustallennuksen.

Seuraava vaihe P0-04 lisää selaimen IndexedDB-tietokannan. Sen tiedot erotetaan kirjautuneen käyttäjän UUID-tunnisteen perusteella, mutta niitä ei lähetetä backendille.
