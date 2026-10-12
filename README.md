# Menomittari

Menomittari on full stack -kurssiprojekti: käyttäjä tuo fiktiivisen CSV-aineiston, tarkastelee menoja ja vertaa kahta ajanjaksoa. React/TypeScript-käyttöliittymä käsittelee taloushistorian paikallisesti IndexedDB:ssä. FastAPI-backend tallentaa vain käyttäjätilit ja kirjautumisistunnot SQLiteen.

Kurssiversio ei ole tuotantopalvelu. Se ei tunnista maksujen toistuvuutta, näytä vuoden yleiskuvaa tai synkronoi taloustietoja. Kaikki [MVP:n rajaukset](docs/project-plan.md#mvpn-rajaukset) ovat projektisuunnitelmassa.

## Käynnistäminen

Tarvitset Docker Desktopin tai muun toimivan Docker Compose -ympäristön. Siirry tähän `lopputyo/menomittari`-kansioon. Node.js:ää, pnpm:ää tai Pythonia ei asenneta isäntäkoneelle; Python käyttää konteissa `uv`:ta, ei `pip`:iä.

```powershell
docker compose build
docker compose run --rm backend uv run --no-sync alembic upgrade head
docker compose up
```

Ensimmäinen komento rakentaa lukitut kehityskuvat, toinen alustaa tai päivittää sovelluksen käyttäjäkannan, ja kolmas käynnistää sovelluksen. Avaa <http://127.0.0.1:5173>. Backendin health: <http://127.0.0.1:8000/api/health>; API-kuvaus: <http://127.0.0.1:8000/docs>.

Vite seuraa tiedostoja polling-menetelmällä Windowsin Docker-liitoshakemiston läpi. Lähdekoodin tallentaminen päivittää näkymää. Vite-asetuksen muutoksen jälkeen käytä `docker compose restart frontend`.

Pysäytä `Ctrl+C`:llä ja poista kontit sekä projektiverkko komennolla `docker compose down`. Älä lisää `--volumes`-valintaa, jos haluat säilyttää backendin käyttäjäkannan.

Kehityksen HTTP-istuntoeväste on `SameSite=Lax` ilman `Secure`-lippua. HTTPS-julkaisussa `MENOMITTARI_SESSION_COOKIE_SECURE=true`; `SameSite=None` edellyttää `Secure`-asetusta. Kehityskäynnistys ei ole tuotantojulkaisuohje.

## Käyttö ja lyhyt esittely

1. Luo fiktiivinen käyttäjätili ja kirjaudu sisään.
2. Avaa **Tuo CSV**. Valitse esimerkkitiedosto ja kokonainen kuukausi tai tiedoston oma ajanjakso.
3. Katso **Yhteenveto**: menot, palautukset, menoryhmät ja **Keskeiset muutokset**. Palautusten info toimii hiirellä, näppäimistöllä ja napautuksella; Escape sulkee tiedon.
4. Avaa **Tapahtumat** rivien tarkasteluun. Jakson valinta säilyy osioiden välillä. **Varmuuskopio** on oma osionsa.

Tuetut muodot ovat Menomittarin demo-CSV ja tunnettu S-Pankin tilitapahtuma-CSV-rakenne, eivät PDF-tiliotteet. Käytä vain fiktiivisiä tietoja.

Esittelypolku uudelle demokäyttäjälle: huhtikuu, toukokuu ja kesäkuu 2026 kokonaisina kuukausina, sitten heinäkuun 1.–15. päivän demo omana ajanjaksona. Näin syntyy 4 tuontia ja 33 tapahtumaa. [Demoaineistot ja käsin tarkistettavat luvut](docs/data-contract.md#demojen-odotusarvot) ovat aineistosopimuksessa.

Kuukauden sisäinen jakso vertautuu edelliskuukauden samoihin päiviin; kokonaiset kuukaudet kokonaisiin kuukausiin niiden pituuseroista huolimatta. Vertailuvälin pitää sisältyä kokonaan yhteen tallennettuun tuontiin. Päällekkäinen tuonti estetään, eikä osajaksoja yhdistetä tai aiempaa tuontia korvata. Palautukset näytetään erikseen eikä niitä vähennetä menoista.

## Varmuuskopio ja lyhyt palautusdemo

Taloushistoria säilyy vain nykyisessä selaimessa. Sivustotietojen poistaminen tai laitteen rikkoutuminen voi hävittää sen; kirjautuminen ei siirrä taloushistoriaa toiselle laitteelle.

1. Tuo yllä kuvattu neljän CSV:n ketju ja valitse **Lataa varmuuskopio**.
2. Varmista selaimen latauksista, että `YYYY-MM-DD.menomittari-backup.json` tallentui. Nimen päivämäärä on UTC-ajassa.
3. Avaa sama sovellus erillisessä tyhjässä selainprofiilissa ja kirjaudu samalle tilille. Älä poista alkuperäisen profiilin historiaa.
4. Valitse ladattu JSON ja paina **Palauta varmuuskopio**. Tarkista 4 jaksoa ja 33 tapahtumaa. Heinäkuun 57,50 € vertautuu kesäkuun 1.–15. päivän 95,00 euroon.
5. Päivitä sivu ja tarkista säilyminen. Palautus jo täytettyyn historiaan estetään, eikä se korvaa tietoja.

Kopio on salaamaton: tiedoston saaja voi lukea tapahtumat. Säilytä kopio turvallisesti myös laitteen ulkopuolella. Se sisältää tuontijaksot ja tapahtumat alkuperäisine tunnisteineen ja luokituksineen, ei käyttäjätiliä, salasanaa, istuntoa, alkuperäisiä CSV:tä tai valmiita analyysejä. Palautus hyväksyy vain tyhjän historian, enintään 16 MiB, siirtomuodon version 1 ja EUR. Se onnistuu kokonaan tai ei lainkaan. Tämä ei ole automaattinen pilvivarmistus tai synkronointi.

## Tarkistukset yhdellä komennolla

Dockerin ollessa käynnissä, PowerShellissä tästä projektikansiosta:

```powershell
.\scripts\check.ps1
```

Skripti rakentaa kehityskuvat ja ajaa frontendin testit, tyyppitarkistuksen, lintin ja julkaisuversiokoosteen sekä backendin migraatiotarkistuksen ja testit. Se pysähtyy ensimmäiseen virheeseen: exit-koodi on 1 epäonnistuessa ja 0 onnistuessa. Ensimmäinen rakennus voi hakea kuvia ja lukittuja riippuvuuksia verkosta, mutta mitään ei asenneta isäntäkoneelle.

Migraatiot tehdään poistuvan testikontin `/tmp`-kantaan. Python-testit käyttävät omia tilapäisiä tai muistikantojaan; frontend-testit `fake-indexeddb`:tä. Skripti ei päivitä tavallista backend-kantaa, tyhjennä selainhistoriaa tai pysäytä käynnissä olevaa sovellusta. `build` tuottaa ohitetun `frontend/dist`-kansion. Selainkäyttötesti tehdään erikseen. Paikallinen skripti ei lisää Menomittaria nykyiseen GitLab-putkeen.

Yksittäinen tarkistus tarvittaessa:

```powershell
docker compose run --rm --no-deps frontend pnpm test
docker compose run --rm --no-deps frontend pnpm typecheck
docker compose run --rm --no-deps frontend pnpm lint
docker compose run --rm --no-deps frontend pnpm build
docker compose run --rm --no-deps backend uv run --no-sync pytest -W error
```

`test` ajaa Vitestin kerran, `typecheck` tarkistaa TypeScript-tyypit, `lint` käyttää Oxlintiä ja `build` kokoaa julkaisutiedostot. Backendin `pytest -W error` käsittelee varoitukset virheinä. Versiot ovat `frontend/package.json`- ja `frontend/pnpm-lock.yaml`-tiedostoissa sekä `backend/pyproject.toml`- ja `backend/uv.lock`-tiedostoissa.

## Tila ja dokumentaatio

P0-01–P0-08 on hyväksytty ja yhdistetty. Käyttäjä vahvisti palautusdemoa koskevan tarkistuksen Chromen vierailijaprofiilissa. P0-09 viimeistelee käyttöliittymän ja yhteisen tarkistuskomennon; ajantasainen tila on työlistassa.

| Dokumentti | Vastuu |
| --- | --- |
| [Projektisuunnitelma](docs/project-plan.md) | Tuotetavoite ja MVP:n rajaukset |
| [Työlista](docs/backlog.md) | Työvaiheiden tilat ja hyväksymisehdot |
| [MVP-arvio](docs/mvp-arvio.md) | Toteutuksen suhde tuotetavoitteeseen |
| [Arkkitehtuuri](docs/architecture.md) | Osarajat, tallennus ja tietoraja |
| [Aineisto ja laskenta](docs/data-contract.md) | CSV/JSON, laskentasäännöt ja demojen luvut |
| [Rajapinnat](docs/api.md) | Sovellustoimintojen ja HTTP-rajapinnan sopimus |
| [P0-08-käyttötesti](docs/p0-08-kayttotesti.md) | Tarkistukset ja vahvistettu palautusdemo |

Työselosteet ja koodinlukuharjoitukset: [P0-01](docs/p0-01-oppituntimateriaali.md), [P0-02](docs/p0-02-oppituntimateriaali.md), [P0-03](docs/p0-03-oppituntimateriaali.md), [P0-04](docs/p0-04-oppituntimateriaali.md), [P0-05](docs/p0-05-oppituntimateriaali.md), [P0-06](docs/p0-06-oppituntimateriaali.md), [P0-07](docs/p0-07-oppituntimateriaali.md), [P0-08](docs/p0-08-oppituntimateriaali.md) ja [P0-09](docs/p0-09-oppituntimateriaali.md).
