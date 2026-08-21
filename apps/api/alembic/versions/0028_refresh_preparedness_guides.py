"""Replace demo preparedness guides with the approved bilingual articles.

Revision ID: 0028_refresh_preparedness_guides
Revises: 0027_resident_portal_foundations
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision: str = "0028_refresh_preparedness_guides"
down_revision: str | None = "0027_resident_portal_foundations"
branch_labels = None
depends_on = None


GUIDE_UPDATES = [
    (
        "paghahanda-sa-baha",
        "flood",
        "n/a",
        "Baha",
        "Flood",
        """## Ano ang Baha?

Ang baha ay pag-apaw ng tubig sa mga lugar na karaniwang tuyong lupa. Maaari itong mangyari kapag malakas o tuloy-tuloy ang ulan, umaapaw ang ilog at kanal, barado ang drainage, o may bagyo.

## Bakit Delikado?

Ang baha ay maaaring magdala ng maruming tubig, basura, chemicals, at germs. Maaari ring maging malakas ang agos at matangay ang tao o sasakyan.

## Bago

1. Alamin ang flood-prone areas at evacuation route.
2. Ihanda ang Emergency Bag.
3. Subaybayan ang official weather at flood warnings.

## Habang May Baha

1. Umakyat sa mas mataas na lugar kung kinakailangan.
2. Huwag lumusong o magmaneho sa baha.
3. Lumayo sa bumagsak na electrical wires.

## Pagkatapos

1. Iwasan ang sirang gusali at delikadong lugar.
2. Gumamit lamang ng ligtas na tubig.
3. Itapon ang pagkaing nadikitan ng baha.

## Tandaan

Huwag makipagsapalaran sa baha.""",
        """## What Is Flooding?

Flooding happens when water covers normally dry land. It can be caused by heavy or prolonged rainfall, overflowing rivers and waterways, blocked drainage, and typhoons.

## Why Is It Dangerous?

Floodwater may contain sewage, chemicals, debris, and germs. Moving water can sweep away people and vehicles.

## Before

1. Know flood-prone areas and your evacuation route.
2. Prepare your Emergency Bag.
3. Monitor official weather and flood warnings.

## During a Flood

1. Move to higher ground when necessary.
2. Never walk or drive through floodwater.
3. Stay away from fallen electrical wires.

## After

1. Avoid damaged buildings and dangerous areas.
2. Use safe drinking water.
3. Throw away food that has touched floodwater.

## Remember

Turn Around, Don’t Drown.""",
        "DOST-PAGASA • WHO",
        1,
    ),
    (
        "kaligtasan-sa-lindol",
        "earthquake",
        "n/a",
        "Lindol",
        "Earthquake",
        """## Ano ang Lindol?

Ang lindol ay biglaang pagyanig ng lupa dahil sa paggalaw sa loob ng Earth’s crust. Maaari itong mangyari anumang oras at walang sapat na babala.

## Bakit Delikado?

Ang lindol ay maaaring magdulot ng pagbagsak ng mga gusali, furniture, at iba pang bagay. Maaari rin itong magdulot ng sunog, landslide, at tsunami sa mga coastal areas.

## Habang Lumilindol

### Yumuko — Drop

Yumuko o dumapa upang hindi matumba.

### Sumilong — Cover

Takpan ang ulo at leeg. Kung maaari, sumilong sa ilalim ng matibay na mesa.

### Kumapit — Hold

Kumapit sa iyong shelter at manatili roon hanggang matapos ang pagyanig.

## Mahalagang Paalala

1. Huwag tumakbo palabas habang lumilindol.
2. Lumayo sa bintana, salamin, at mga bagay na maaaring mahulog.
3. Kung nasa loob ng gusali, manatili sa ligtas na lugar hanggang matapos ang pagyanig.

## Pagkatapos

1. Suriin ang sarili at ibang tao kung may injury.
2. Maghanda sa aftershocks.
3. Huwag pumasok sa sirang gusali.
4. Sundin ang official instructions at advisories.

## Kung Nasa Coastal Area

Kung nakaranas ng malakas o matagal na pagyanig, lumayo agad sa dagat at pumunta sa mas mataas na lugar. Huwag hintayin ang official tsunami warning.

## Tandaan

Yumuko. Sumilong. Kumapit.""",
        """## What Is an Earthquake?

An earthquake is the sudden shaking of the ground caused by movement within the Earth’s crust. It can happen at any time with little or no warning.

## Why Is It Dangerous?

Earthquakes can cause buildings, furniture, and other objects to fall. They may also trigger fires, landslides, and tsunamis in coastal areas.

## During an Earthquake

### Drop

Drop to your hands and knees to avoid being knocked down.

### Cover

Cover your head and neck. If possible, take shelter under a sturdy table or desk.

### Hold

Hold on to your shelter until the shaking stops.

## Important Reminders

1. Do not run outside while the ground is shaking.
2. Stay away from windows, glass, and falling objects.
3. If you are indoors, stay in a safe place until the shaking stops.

## After

1. Check yourself and others for injuries.
2. Be prepared for aftershocks.
3. Do not enter damaged buildings.
4. Follow official instructions and advisories.

## If You Are in a Coastal Area

If you experience strong or long-lasting shaking, move away from the shore and go to higher ground. Do not wait for an official tsunami warning.

## Remember

Drop. Cover. Hold.""",
        "DOST-PHIVOLCS",
        2,
    ),
    (
        "kaligtasan-sa-sunog",
        "fire",
        "n/a",
        "Sunog",
        "Fire Prevention & Safety",
        """## Ano ang Sunog?

Ang sunog ay mabilis na pagkalat ng apoy na maaaring makasira ng ari-arian at magdulot ng malubhang injury o pagkamatay. Maaari itong magsimula dahil sa electrical problems, pagluluto, kandila, gas, at iba pang sources of heat.

## Bakit Delikado?

Ang sunog ay hindi lamang tungkol sa apoy. Ang usok at toxic gases ay maaaring makapinsala sa paghinga at maaaring maging sanhi ng pagkawala ng malay.

## Iwasan ang Sunog

1. Huwag mag-overload ng electrical outlets.
2. Huwag iwanang walang bantay ang niluluto.
3. Ilayo ang kandila at apoy sa mga madaling masunog na bagay.
4. Huwag harangan ang mga pintuan at emergency exits.

## Kapag May Sunog

Kung maliit ang apoy at ligtas itong kontrolin, gamitin lamang ang tamang fire extinguisher kung alam mo kung paano ito gamitin at may malinaw kang escape route.

Kung mabilis kumakalat ang apoy o maraming usok:

## Lumabas. Huwag Bumalik.

1. Huwag bumalik para kunin ang mga gamit.
2. Huwag ilagay sa panganib ang iyong buhay.
3. Humingi agad ng tulong sa emergency responders.

## Plano sa Paglikas Kapag May Sunog

1. Alamin ang hindi bababa sa dalawang posibleng labasan.
2. Magtakda ng meeting point sa labas.
3. Mag-practice ng fire escape plan kasama ang pamilya.
4. Tulungan ang mga bata, senior citizens, at persons with disabilities.

## Tandaan

Napapalitan ang gamit. Hindi ang buhay.""",
        """## What Is a Fire?

A fire can spread quickly, causing property damage, serious injuries, or death. Common causes include electrical problems, cooking, candles, gas, and other heat sources.

## Why Is It Dangerous?

Fire is not only about flames. Smoke and toxic gases can make breathing difficult and may cause unconsciousness.

## Prevent Fires

1. Do not overload electrical outlets.
2. Never leave cooking unattended.
3. Keep candles and flames away from flammable materials.
4. Keep doors and emergency exits clear.

## In Case of Fire

If the fire is small and safe to control, use the appropriate fire extinguisher only if you know how to use it and have a clear escape route.

If the fire is spreading quickly or there is heavy smoke:

## Get Out. Stay Out.

1. Do not go back for your belongings.
2. Do not risk your life.
3. Call for emergency assistance.

## Fire Escape Plan

1. Know at least two possible exits.
2. Choose an outdoor meeting point.
3. Practice your fire escape plan with your family.
4. Assist children, older adults, and persons with disabilities.

## Remember

Property can be replaced. Lives cannot.""",
        "Bureau of Fire Protection (BFP)",
        3,
    ),
    (
        "paghahanda-sa-bagyo",
        "typhoon",
        "n/a",
        "Bagyo",
        "Typhoon",
        """## Ano ang Bagyo?

Ang bagyo ay isang malakas na weather system na maaaring magdala ng malakas na ulan, hangin, baha, landslide, at daluyong o storm surge.

## Bakit Delikado?

Ang malakas na ulan ay maaaring magdulot ng baha at landslide. Ang malakas na hangin ay maaaring magpatumba ng mga puno, poste, at iba pang bagay. Sa coastal areas, maaaring magkaroon ng storm surge.

## Bago ang Bagyo

1. Subaybayan ang official PAGASA updates.
2. Alamin ang evacuation center at evacuation route.
3. I-secure ang mga bagay na maaaring tangayin ng hangin.
4. Ihanda ang Emergency Bag.
5. I-charge ang phones, flashlights, at power banks.

## Habang May Bagyo

1. Manatili sa ligtas na lugar at sundin ang official instructions.
2. Lumayo sa bintana at salamin.
3. Huwag bumiyahe sa baha o delikadong kalsada.
4. Lumikas agad kapag inabisuhan ng authorities.

## Storm Surge / Daluyong

Ang storm surge ay biglaang pagtaas ng tubig-dagat na dulot ng malakas na bagyo. Maaari itong mabilis na pumasok sa coastal communities.

Kung nakatira malapit sa dagat, lumikas sa mas mataas at ligtas na lugar kapag inabisuhan.

Huwag pumunta sa shoreline upang manood ng malalaking alon.

## Pagkatapos ng Bagyo

1. Maghintay ng official clearance bago bumalik sa inyong tahanan.
2. Mag-ingat sa bumagsak na electrical wires at sirang structures.
3. Patuloy na subaybayan ang official weather at emergency updates.

## Tandaan

Maghanda nang maaga. Lumikas nang maaga. Manatiling ligtas.""",
        """## What Is a Typhoon?

A typhoon is a powerful weather system that can bring heavy rainfall, strong winds, flooding, landslides, and storm surge.

## Why Is It Dangerous?

Heavy rain can cause flooding and landslides. Strong winds can bring down trees, power lines, and structures. Coastal areas may also experience storm surge.

## Before the Typhoon

1. Monitor official PAGASA updates.
2. Know your evacuation center and evacuation route.
3. Secure loose objects that may be blown away.
4. Prepare your Emergency Bag.
5. Charge your phones, flashlights, and power banks.

## During the Typhoon

1. Stay in a safe place and follow official instructions.
2. Stay away from windows and glass.
3. Do not travel through flooded or dangerous roads.
4. Evacuate immediately when instructed by authorities.

## Storm Surge

Storm surge is an abnormal rise of seawater caused by a strong storm. It can quickly inundate coastal communities.

If you live near the coast, evacuate to higher ground when instructed.

Do not go to the shoreline to watch large waves.

## After the Typhoon

1. Wait for official clearance before returning home.
2. Watch out for fallen electrical wires and damaged structures.
3. Continue monitoring official weather and emergency updates.

## Remember

Prepare early. Evacuate early. Stay safe.""",
        "DOST-PAGASA • NDRRMC/OCD",
        4,
    ),
    (
        "san-jose-go-bag",
        "food",
        "n/a",
        "San Jose Emergency + Nutrition Bag",
        "Emergency and Nutrition Bag",
        """## Bakit Mahalaga ang Nutrition Bag?

Sa panahon ng disaster, mahalagang equipped tayo hindi lamang sa mga gamit tulad ng pito at flashlight, kundi pati sa sapat, ligtas, at masustansyang pagkain at tubig. Kailangan ng ating katawan ng sapat na energy, hydration, at nutrients upang manatiling malakas at alerto sa gitna ng kalamidad.

## Ano ang Dapat Ihanda?

Ang Nutrition Bag ay dapat may pagkaing hindi madaling masira, madaling ihanda, ligtas kainin, at angkop sa pangangailangan ng buong pamilya.

## 1. Tubig

1. Maghanda ng sapat na ligtas na inuming tubig para sa pamilya.
2. Panatilihing malinis, sealed, at protektado sa contamination ang tubig.

## 2. Pagkain

Pumili ng pagkaing:

1. Hindi madaling masira.
2. Masustansya at nagbibigay ng energy.
3. Madaling ihanda o ready-to-eat.
4. Angkop sa pangangailangan ng pamilya.

## 3. Isipin ang Pangangailangan ng Bawat Isa

Maghanda ng pagkain ayon sa edad, health needs, allergies, at dietary requirements ng bawat miyembro ng pamilya.

- Para sa mga sanggol at bata: Ihanda ang kanilang kinakailangang pagkain at inumin.
- Para sa senior citizens: Pumili ng pagkaing madaling kainin at angkop sa kanilang pangangailangan.
- Para sa may special dietary needs o allergies: Siguraduhing ligtas at angkop ang ingredients.

## 4. Ihiwalay at Protektahan

Huwag pagsama-samahin ang lahat ng pagkain at supplies sa isang plastic bag.

Ilagay ang pagkain sa malinis, sealed, at waterproof containers o bags upang maprotektahan laban sa tubig, dumi, at pests.

## 5. Ayusin ang Pagkain

Ihiwalay ang pagkain ayon sa uri at paggamit:

- READY-TO-EAT — Pagkaing maaaring kainin agad
- FOOD FOR PREPARATION — Pagkaing kailangang ihanda
- SPECIAL DIETARY FOOD — Pagkain para sa espesyal na pangangailangan
- WATER — Inuming tubig

## 6. Magdala ng Tamang Gamit

Kung may canned food, magdala ng manual can opener.

Magdala rin ng basic eating utensils at mga gamit na kailangan para ligtas na maihanda at makain ang pagkain.

## 7. Panatilihing Ligtas ang Pagkain

1. Panatilihing malinis ang kamay, lalagyan, at kagamitan.
2. Ihiwalay ang raw food sa lutong pagkain.
3. Gumamit lamang ng ligtas na tubig.
4. Huwag kainin ang pagkaing nadikitan ng baha.

## 8. I-check Regularly

1. Tingnan ang expiration date ng pagkain.
2. Palitan ang expired o sirang packaging.
3. I-check ang water supply.
4. I-update ang pagkain ayon sa pangangailangan ng pamilya.

## Tandaan

Ang Nutrition Bag ay hindi lang para mabusog. Ito ay para sa sapat na energy, nutrition, hydration, at kalusugan sa panahon ng disaster.""",
        """## Why Is a Nutrition Bag Important?

During a disaster, we need more than emergency equipment such as whistles and flashlights. We also need enough safe and nutritious food and water to maintain energy, hydration, and strength.

## What Should You Prepare?

Your Nutrition Bag should contain food that is shelf-stable, easy to prepare, safe to eat, and suitable for the needs of your family.

## 1. Water

1. Prepare enough safe drinking water for your family.
2. Keep water clean, sealed, and protected from contamination.

## 2. Food

Choose food that is:

1. Shelf-stable.
2. Nutritious and provides energy.
3. Easy to prepare or ready-to-eat.
4. Suitable for your family’s needs.

## 3. Consider Everyone’s Needs

Choose food based on the age, health needs, allergies, and dietary requirements of each family member.

- For babies and children: Prepare their required food and drinks.
- For older adults: Choose food that is easy to eat and appropriate for their needs.
- For those with special dietary needs or allergies: Make sure the ingredients are safe and appropriate.

## 4. Separate and Protect

Do not put all food and supplies in one plastic bag.

Keep food in clean, sealed, and waterproof containers or bags to protect it from water, dirt, and pests.

## 5. Organize the Food

Separate food according to type and use:

- READY-TO-EAT — Food that can be eaten immediately
- FOOD FOR PREPARATION — Food that needs to be prepared
- SPECIAL DIETARY FOOD — Food for special needs
- WATER — Drinking water

## 6. Bring the Right Tools

If you pack canned food, bring a manual can opener.

Bring basic eating utensils and supplies needed to safely prepare and eat the food.

## 7. Keep Food Safe

1. Keep hands, containers, and utensils clean.
2. Separate raw food from cooked food.
3. Use safe water.
4. Do not eat food that has touched floodwater.

## 8. Check Regularly

1. Check food expiration dates.
2. Replace expired food or damaged packaging.
3. Check your water supply.
4. Update food supplies according to your family’s needs.

## Remember

The Nutrition Bag is not only about filling your stomach. It supports energy, nutrition, hydration, and health during a disaster.""",
        "Department of Health (DOH) • National Nutrition Council (NNC)",
        5,
    ),
]


def upgrade() -> None:
    guide = sa.table(
        "guide",
        sa.column("slug", sa.Text()),
        sa.column("hazard_type", sa.Text()),
        sa.column("phase", sa.Text()),
        sa.column("title_fil", sa.Text()),
        sa.column("title_en", sa.Text()),
        sa.column("body_fil", sa.Text()),
        sa.column("body_en", sa.Text()),
        sa.column("source_attribution", sa.Text()),
        sa.column("last_reviewed_at", sa.DateTime(timezone=True)),
        sa.column("sort_order", sa.Integer()),
        sa.column("is_published", sa.Boolean()),
    )

    for (
        slug,
        hazard_type,
        phase,
        title_fil,
        title_en,
        body_fil,
        body_en,
        source_attribution,
        sort_order,
    ) in GUIDE_UPDATES:
        op.execute(
            guide.update()
            .where(guide.c.slug == slug)
            .values(
                hazard_type=hazard_type,
                phase=phase,
                title_fil=title_fil,
                title_en=title_en,
                body_fil=body_fil,
                body_en=body_en,
                source_attribution=source_attribution,
                last_reviewed_at=sa.func.now(),
                sort_order=sort_order,
                is_published=True,
            )
        )


def downgrade() -> None:
    # This migration publishes project-supplied content. Reverting it would
    # require restoring the previous demo copy, which was not authoritative.
    pass
