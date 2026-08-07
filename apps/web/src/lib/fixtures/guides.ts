import type { PublicGuide } from "@/lib/api/public-types";
import { daysAgo } from "./clock";

/**
 * Preparedness guides (FR-PRP-001/003/004/007, FR-PUB-005).
 *
 * Bilingual by column, not by translation table — `schema.md` Section 11 chose
 * `*_fil` / `*_en` pairs, so both languages travel in the same row and the
 * language toggle switches which column renders.
 *
 * Content is written as original short summaries of publicly issued guidance and
 * attributed via `source_attribution` (FR-PRP-007). It has **not** been reviewed
 * by the barangay's health or disaster leads — treat it as placeholder copy of
 * the right shape and length, not as advice to publish.
 */

function guide(
  n: number,
  slug: string,
  hazard: PublicGuide["hazard_type"],
  phase: PublicGuide["phase"],
  titleFil: string,
  titleEn: string,
  bodyFil: string,
  bodyEn: string,
  source: string,
  reviewedDaysAgo: number,
  sortOrder: number,
): PublicGuide {
  const excerpt = (s: string) => {
    const firstLine =
      s
        .split("\n")
        .find((l) => l.trim() && !l.startsWith("#"))
        ?.trim() ?? "";
    return firstLine.length > 160 ? `${firstLine.slice(0, 157)}…` : firstLine;
  };
  return {
    id: `f1000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    slug,
    hazard_type: hazard,
    title_fil: titleFil,
    title_en: titleEn,
    phase,
    source_attribution: source,
    last_reviewed_at: daysAgo(reviewedDaysAgo),
    sort_order: sortOrder,
    excerpt_fil: excerpt(bodyFil),
    excerpt_en: excerpt(bodyEn),
    body_fil: bodyFil,
    body_en: bodyEn,
  };
}

export const GUIDES: PublicGuide[] = [
  guide(
    1,
    "paghahanda-sa-baha",
    "flood",
    "before",
    "Paghahanda Bago Bumaha",
    "Preparing Before a Flood",
    `Ang baha sa San Jose ay kadalasang mabilis tumaas. Ang paghahanda bago pa man umulan nang malakas ang siyang pinakamahalagang hakbang.

## Bago pa man umulan

Alamin kung ang inyong bahay ay nasa lugar na madalas bahain. Tingnan ang hazard map ng barangay at kilalanin ang pinakamalapit na evacuation center at ang ligtas na daan papunta roon.

Ihanda ang Go Bag at ilagay ito sa lugar na madaling maabot. Ilagay ang mga mahahalagang dokumento sa plastik na selyado.

## Kapag may babala

Ilipat sa mataas na bahagi ng bahay ang mga appliance at kagamitan. Patayin ang kuryente sa mga bahaging maaaring abutin ng tubig.

Huwag hintaying umabot sa pintuan ang tubig bago lumikas. Ang paglikas nang maaga ay mas ligtas kaysa paglikas habang tumataas ang tubig.

## Mga hindi dapat gawin

Huwag tumawid sa umaagos na tubig-baha. Ang tubig na abot-tuhod lamang ay kayang tangayin ang isang tao. Huwag ding magmaneho sa binahang kalsada.`,
    `Flooding in San Jose tends to rise quickly. Preparing before the heavy rain arrives is the single most useful thing a household can do.

## Before the rain

Find out whether your home sits in an area that floods often. Check the barangay hazard map, identify the nearest evacuation centre, and work out a safe route to it.

Pack a Go Bag and keep it somewhere you can reach without searching. Seal important documents in plastic.

## When a warning is issued

Move appliances and belongings to the highest floor available. Switch off electricity to any part of the house water could reach.

Do not wait for water to reach your door before leaving. Evacuating early is considerably safer than evacuating while the water rises.

## What not to do

Never cross moving floodwater. Water only knee-deep is enough to sweep an adult off their feet. Do not drive through flooded roads either.`,
    "Adapted from NDRRMC and Philippine Red Cross public guidance",
    12,
    1,
  ),
  guide(
    2,
    "kaligtasan-sa-lindol",
    "earthquake",
    "during",
    "Kaligtasan Tuwing Lindol",
    "Earthquake Safety",
    `Walang babala ang lindol. Ang natutunan mong gawin bago pa ito mangyari ang siyang gagawin mo kapag lumindol.

## Habang lumilindol

Duck, Cover, and Hold. Lumuhod, magtago sa ilalim ng matibay na mesa, at kumapit hanggang tumigil ang pagyanig.

Kung nasa labas, lumayo sa mga gusali, poste ng kuryente, at pader. Manatili sa bukas na lugar.

## Pagkatapos ng pagyanig

Maghanda sa aftershock. Karaniwang mas mahina ito ngunit maaaring magpabagsak ng mga bahaging nabitak na.

Suriin ang bahay bago pumasok muli. Kung may amoy ng gas, huwag magbukas ng ilaw o anumang de-kuryente.

## Paghahanda

Ikabit sa dingding ang mga matataas na aparador. Alamin kung saan ang shut-off valve ng gas at tubig.`,
    `Earthquakes give no warning. What you already know how to do is what you will actually do when the shaking starts.

## During the shaking

Duck, Cover, and Hold. Drop to your knees, get under sturdy furniture, and hold on until the shaking stops.

If you are outside, move away from buildings, power lines, and walls. Stay in the open.

## After the shaking

Expect aftershocks. They are usually weaker, but they can bring down anything the first shock already cracked.

Inspect the house before going back inside. If you smell gas, do not switch on lights or any electrical appliance.

## Preparing in advance

Anchor tall cabinets to the wall. Learn where the gas and water shut-off valves are.`,
    "Adapted from PHIVOLCS and NDRRMC public guidance",
    18,
    2,
  ),
  guide(
    3,
    "kaligtasan-sa-sunog",
    "fire",
    "before",
    "Pag-iwas at Kaligtasan sa Sunog",
    "Fire Prevention and Safety",
    `Karamihan sa sunog sa bahay ay nagsisimula sa kusina o sa maling paggamit ng kuryente. Napipigilan ang halos lahat ng ito.

## Pag-iwas

Huwag mag-overload ng extension cord. Isang malaking appliance kada saksakan.

Huwag iwanang nakabukas ang kalan. Patayin ang gas tank pagkatapos magluto.

Ilayo sa kandila at posporo ang mga bata.

## Kapag may sunog

Lumabas agad at tumawag sa bumbero. Huwag munang kunin ang mga gamit.

Gumapang kung may usok — mas malinis ang hangin malapit sa sahig.

Kung may apoy sa kawali, takpan ito ng takip. Huwag buhusan ng tubig.

## Paghahanda

Magkasundo ang pamilya kung saan magkikita sa labas ng bahay.`,
    `Most house fires start in the kitchen or from misused electricity. Nearly all of them are preventable.

## Prevention

Do not overload extension cords. One large appliance per outlet.

Never leave a lit stove unattended. Shut the gas tank off after cooking.

Keep candles and matches away from children.

## If a fire starts

Get out first and call the fire station. Do not stop to collect belongings.

Crawl if there is smoke — the air is cleaner near the floor.

If a pan catches fire, cover it with a lid. Never pour water on it.

## Preparing in advance

Agree with your family on a single meeting point outside the house.`,
    "Adapted from Bureau of Fire Protection public guidance",
    25,
    3,
  ),
  guide(
    4,
    "paghahanda-sa-bagyo",
    "typhoon",
    "before",
    "Paghahanda sa Bagyo",
    "Typhoon Preparedness",
    `Hindi tulad ng lindol, may babala ang bagyo. Ang oras na iyon ang dapat gamitin.

## Bago dumating

Sundan ang mga anunsyo ng PAGASA at ng barangay. Alamin ang signal number at ang inaasahang dami ng ulan.

Ayusin ang bubong at kanal. Ang barado na kanal ay nagpapabilis ng pagbaha.

Mag-imbak ng tubig at pagkain para sa tatlong araw. Isipin ang kuryenteng mawawala.

## Habang may bagyo

Manatili sa loob at malayo sa bintana. Huwag lumabas kapag tumahimik — maaaring mata ito ng bagyo.

## Pagkatapos

Mag-ingat sa mga nakalaylay na kable ng kuryente. Ituring silang buhay hanggang may magpatunay na hindi.`,
    `Unlike an earthquake, a typhoon announces itself. That warning time is the whole point.

## Before it arrives

Follow PAGASA and barangay advisories. Note the signal number and the expected rainfall.

Repair the roof and clear the drains. A blocked drain makes flooding arrive faster.

Store three days of water and food. Plan around losing power.

## During the storm

Stay indoors and away from windows. Do not go out when it suddenly goes quiet — that may be the eye passing over.

## After it passes

Treat every fallen power line as live until somebody qualified says otherwise.`,
    "Adapted from PAGASA and NDRRMC public guidance",
    9,
    4,
  ),
  guide(
    5,
    "san-jose-go-bag",
    "food",
    "n/a",
    "San Jose Go Bag Essentials",
    "San Jose Go Bag Essentials",
    `Ang Go Bag ay ang bag na dadalhin mo kapag kailangan mong umalis sa loob ng limang minuto. Nakahanda ito bago pa kailanganin.

## Tubig at pagkain

Tubig para sa tatlong araw. Pagkaing hindi kailangang lutuin: de-lata, biskwit, at instant noodles.

Manu-manong can opener. Ang de-latang hindi mabuksan ay walang silbi.

## Dokumento

Kopya ng mga ID, birth certificate, at barangay clearance sa selyadong plastik.

## Gamot at pangunang lunas

Ang regular na gamot ng bawat miyembro para sa isang linggo. First aid kit.

## Iba pang kagamitan

Flashlight at ekstrang baterya. Powerbank. Sipol — mas malayo ang abot nito kaysa sa sigaw kapag ikaw ay naipit.

## Para sa San Jose

Ilagay ang buong bag sa malaking plastik bago isilid — nananatiling tuyo ang laman kahit umabot sa dibdib ang tubig sa daan papuntang evacuation center.`,
    `A Go Bag is the bag you take when you have five minutes to leave. It is packed before it is needed, not during.

## Water and food

Three days of drinking water. Food that needs no cooking: canned goods, biscuits, instant noodles.

A manual can opener. A can you cannot open is not food.

## Documents

Photocopies of IDs, birth certificates, and barangay clearance, sealed in plastic.

## Medicine and first aid

A week of each family member's regular medication. A basic first aid kit.

## Other equipment

Flashlight and spare batteries. A power bank. A whistle — it carries much further than a shout if you are trapped.

## Specific to San Jose

Line the whole bag with a large plastic sack before packing. The route to most evacuation centres here can reach chest height, and a soaked Go Bag has already failed.`,
    "Adapted from NDRRMC, DOH and National Nutrition Council public guidance",
    6,
    5,
  ),
];

export function guideBySlug(slug: string): PublicGuide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
