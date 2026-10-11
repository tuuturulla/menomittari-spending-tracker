# P0-08: käyttötesti

Tarkistus tehtiin 11.10.2026 Windowsissa Codexin sisäisellä Chromium-selaimella. Selaimen ilmoittama user-agent sisältää `Chrome/155.0.0.0`; kyse ei ole erikseen testatusta Chrome-asennuksesta.

## Testiympäristö

Testissä käytettiin vain repositoryn fiktiivisiä aineistoja, kahta testikäyttäjää ja kahta tilapäistä backend-kantaa Docker-konteissa. Lähde oli `http://localhost:5174` ja palautuskohde `http://127.0.0.1:5175`. Nämä ovat eri selainalkuperiä ja käyttävät eri IndexedDB-tallennuksia. Ne olivat kuitenkin samassa selainprofiilissa: tämä ei korvaa erillisen profiilin hyväksymistestiä. Käyttäjän tavallista historiaa tai backend-kantaa ei tyhjennetty.

Ensimmäinen CSV valittiin selaimen tiedostovalitsimella. Myöhemmät CSV:t ja virhetilanteiden JSON-tiedostot asetettiin väliaikaisen testisivun painikkeilla oikeisiin tiedostokenttiin; sovellus käsitteli ne normaalisti. Varmuuskopio ladattiin oikealla latauspainikkeella ja ladattu tiedosto valittiin palautukseen oikealla tiedostovalitsimella. Testisivu käytti varsinaista App-komponenttia, oikeaa backendia ja selaimen IndexedDB:tä. Se ei simuloinut tuontia tai tallennusta. Testisivu ja apupainikkeet poistettiin lähdekoodista testin jälkeen.

## Todennetut tulokset

| Tarkistus | Tulos |
| --- | --- |
| Rekisteröinti ja kirjautuminen | Molemmat testikäyttäjät pääsivät omaan tyhjään historiaansa. |
| Huhtikuun ja toukokuun tuonti | 9 tapahtumaa kummassakin; menot 90,00 € ja 145,00 €, palautukset 5,00 €. Vertailu +55,00 € / +61,11 %. |
| Kesäkuun ja heinäkuun osajakson tuonti | 9 ja 6 tapahtumaa; heinäkuun 57,50 € vertautui kesäkuun päivien 1–15 summaan 95,00 €, muutos −37,50 € / −39,47 %. |
| Päällekkäinen koko heinäkuun tuonti | Estyi; ilmoitus nimesi valitun koko kuukauden ja jo tallennetun 1.–15.7. jakson. Neljä vanhaa jaksoa säilyivät. |
| Virheellinen CSV | Estyi otsikkovirheeseen ilman osittaista tuontia. |
| Todellinen tiedostolataus | `2026-10-11.menomittari-backup.json` löytyi selaimen latauspolusta. |
| Ladatun tiedoston palautus tyhjään kohteeseen | 4 jaksoa ja 33 tapahtumaa; heinäkuun yhteenveto ja vertailu täsmäsivät. |
| Palautus ei-tyhjään historiaan | Kelvollisen tyhjän testikopion palautus estyi. Virhe näkyi palautuspainikkeen alla ja sai kohdistuksen. |
| Virheellinen varmuuskopio | Puuttuvat kentät hylättiin; olemassa oleva historia säilyi. |
| Sivun päivitys | Molempien testikäyttäjien neljä jaksoa ja heinäkuun luvut säilyivät. |
| 390 × 844 pikselin näkymä | Palautuskentät, painikkeet ja virheviesti pysyivät luettavina ilman sivun vaakavieritystä. |
| Sovelluksen verkkopyyntöjen tietoraja | Testisivu seurasi sovelluksen `fetch`-kutsujen URL:ia, menetelmää ja JSON-kenttien nimiä, ei niiden arvoja. Tuonnin, analyysin, viennin ja palautuksen aikana ei havaittu taloustietoja lähettäviä kutsuja; sivun avauksessa tehtiin kirjautumistilan GET-pyyntö. Tämä on rajattu havainto, ei kaikkien mahdollisten verkkokanavien turvallisuusauditointi. |

## Automaattiset tarkistukset

Docker-konteissa samalla lopullisella toteutuksella:

- Frontend: 152 testiä 21 testitiedostossa, kaikki hyväksytty.
- TypeScript-tyyppitarkistus hyväksytty.
- Oxlint: 0 virhettä ja 0 varoitusta.
- Viten julkaisuversio koottu onnistuneesti.
- Backend: 9 testiä hyväksytty komennolla `uv run --no-sync pytest -W error`.

Palautuksen integraatiotesti vertaa alkuperäisiä ja palautettuja tietueita kenttä kentältä sekä kaikkien neljän jakson analyysituloksia. Lisäksi testataan kesken kirjoituksen aiheutettu virhe: tuontitietueetkin peruuntuvat. Kahden yhteyden samanaikaisista palautuksista vain toinen hyväksytään.

## Vielä tarkistettava

Erillisessä tyhjässä selainprofiilissa tehtävä palautus on tekemättä. Käytä [README:n palautusdemoa](../README.md#varmuuskopio-ja-lyhyt-palautusdemo): kirjaudu samalle fiktiiviselle tilille uudessa profiilissa, palauta tiedosto ja tarkista luvut sekä sivun uudelleenavaus. Älä tyhjennä alkuperäistä historiaa. Kirjaa tähän käytetty selain, versio ja tulos tarkistuksen jälkeen.

P0-08 on tarkistettavana, ei vielä valmis. Laajempaa ulkoasu-uudistusta tai muiden selainten testikierrosta ei toteutettu tässä työosuudessa.
