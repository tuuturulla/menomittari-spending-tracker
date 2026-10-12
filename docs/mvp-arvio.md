# MVP:n suhde tuotetavoitteeseen

Menomittarin tuotetavoite on tehdä rahankäyttö ja säännöllisten arjen kulujen kertynyt vaikutus ymmärrettäväksi. Kurssityön nykyinen toteutus osoittaa tuonnin, paikallisen tallennuksen, esimerkkiluokittelun ja ajanjaksovertailun toimivuuden. Se ei vielä osoita koko tuotetavoitteen toteutumista. [Projektisuunnitelma](project-plan.md#mvpn-rajaukset) määrittää rajaukset; tämä arvio ei itsessään ole lupa aloittaa uusia ominaisuuksia.

## Esittelyn kannalta tärkeät asiat

| Asia | Nykyinen ero tai riski | MVP:n päätös tai tarvittava jatko |
| --- | --- | --- |
| Kuukausiseuranta | Alkuperäinen saman päivämääräpituuden ja peräkkäisyyden vaatimus esti tavallisten kuukausien vertailun. | Kuukausivalinta sekä edelliskuukauden vastaavan välin vertailu korjaavat kitkaa. Puuttuva kattavuus estää vertailun ja todelliset laskentavälit näytetään. |
| Tuonnin eston ymmärrettävyys | Pelkkä ilmoitus päällekkäisyydestä ei kertonut, mikä tallennettu jakso esti tuonnin. | Virheviesti nimeää jaksot ja kertoo, ettei niitä yhdistetä tai korvata. Tämä on jaksosuoja, ei tapahtumakohtainen duplikaattitunnistus. |
| Säännöllisten kulujen tunnistus | Tilaukset-kategoria perustuu yhteen fiktiiviseen kauppiassääntöön, ei toistuvuuden analyysiin. Keskeinen tuotetavoite jää vielä osoittamatta. | Esittelyssä ei väitetä automaattista tilausten tai rahankäyttötapojen tunnistusta. Varsinainen tunnistus vaatii erikseen sovittavan jatkovaiheen ja sitä testaavan pidemmän aineiston. |
| Oikeiden tapahtumien tulkinta | Kauppiasluokittelu kattaa neljä esimerkkinimeä. S-Pankin negatiivinen omien tilien siirto voi näkyä menona, ja positiivinen palautus tulona. | Kurssiesittely käyttää vain fiktiivisiä aineistoja. Tuonnin rakenteen lukeminen ei tarkoita, että todellinen talousdata tulkitaan kattavasti oikein. Oikea käyttö vaatisi tyyppien ja luokitusten tarkistamisen tai korjaamisen. |
| Kesken kuun täydentäminen ja virheen korjaus | Osajakson jälkeen koko saman kuukauden tuonti estyy. Erillisiä osajaksoja ei myöskään koota yhdeksi kuukausiyhteenvedoksi. Väärin ilmoitetulle jaksolle ei ole korjaustoimintoa. | Rajoitus kerrotaan tuonnissa. Tämä on edelleen käyttökitkaa, ei kuukausivalinnalla ratkaistu ongelma. Yhdistely ja korvaus vaativat oman tietojen säilymisen ja duplikaattien käsittelyn suunnittelun. |
| Talouden kokonaiskuva | Menoyhteenveto ei sisällä tuloja, nettokassavirtaa, tilin saldoa tai vuoden näkymää. Palautuksia ei vähennetä menoista. | Raportti esitellään menojen vertailuna, ei täydellisenä taloustilanteena tai säästölaskelmana. Koko historian yleiskuva jää jatkokehitykseen. |
| Paikallisen historian säilyminen | Manuaalinen varmuuskopio ja palautus on toteutettu; ilman käyttäjän tallentamaa kopiota historian katoamisriski säilyy. Kirjautuminen vaatii backendin; paikallinen tallennus ei yksin tee sovelluksesta offline-käytettävää. | Vienti ja palautus on testattu; käyttäjä vahvisti palautuksen Chromen vierailijaprofiilissa. Kopio on salaamaton eikä synkronointi tai automaattinen pilvivarmistus. Offline-käyttö ei ole MVP:n vaatimus. |
| Ulkoasu | P0-09 jakaa toiminnot osioihin ja erottaa vertailun summat ja muutoksen pylväsesityksessä. | Viimeistely tukee nykyisen jakson silmäiltävyyttä, ei lisää vuoden yleiskuvaa tai uusia havaintosääntöjä. Mittarimato on brändikuva, ei talouden tilan arvio. |

## Johtopäätös

Kurssityön rajattuna full stack -prototyyppinä toteutus on johdonmukainen, kun esittelyn väitteet vastaavat sen todellista laajuutta. Toiminnallinen MVP ja palautusdemo on hyväksytty; P0-09:n esitystapa tarkistetaan erikseen. Säännöllisten kulujen tunnistusta ei voi korvata pelkällä Tilaukset-kategorialla tai visuaalisella viimeistelyllä; se vaatii uuden rajatun toteutuspäätöksen.
