import type { PublicFaq } from "@/lib/api/public-types";

/**
 * FAQs (FR-PRP-005, FR-PUB-011). Bilingual by column, same as `guide`.
 *
 * The `registration` entry is load-bearing: the navbar's Login and Register
 * buttons point at `#registration` on the help page, because accounts do not
 * exist until the registry module (M1) ships. Pointing them at a route that 404s
 * would look broken; a stub sign-in page would be scope creep and would lie.
 */
export const FAQS: PublicFaq[] = [
  {
    id: "01000000-0000-4000-8000-000000000001",
    question_fil: "Paano ako makakapagparehistro ng aking sambahayan?",
    question_en: "How do I register my household?",
    answer_fil:
      "Ang online na pagpaparehistro ay hindi pa bukas. Sa ngayon, maaari kayong magparehistro nang personal sa barangay hall tuwing Lunes hanggang Biyernes, 8:00 AM hanggang 5:00 PM. Tinutulungan din kayo ng inyong Barangay Health Worker sa inyong tahanan. Dalhin ang isang valid ID at ang mga pangalan at edad ng bawat miyembro ng sambahayan.",
    answer_en:
      "Online registration is not open yet. For now you can register in person at the barangay hall, Monday to Friday, 8:00 AM to 5:00 PM. Your Barangay Health Worker can also assist you at home. Bring one valid ID and the names and ages of every household member.",
    category: "Registration",
    sort_order: 1,
  },
  {
    id: "01000000-0000-4000-8000-000000000002",
    question_fil: "Bakit kailangang magparehistro?",
    question_en: "Why should I register?",
    answer_fil:
      "Ang rehistro ang ginagamit ng barangay upang malaman kung sino ang nasa mga lugar na madaling bahain, sino ang may kapansanan o sakit na kailangang unahin sa paglikas, at ilan ang inaasahang darating sa bawat evacuation center. Hindi ito ginagamit para sa anumang bayarin o buwis.",
    answer_en:
      "The barangay uses the registry to know who lives in flood-prone areas, which households include someone who needs help evacuating, and how many people to expect at each evacuation centre. It is not used for any fee or tax.",
    category: "Registration",
    sort_order: 2,
  },
  {
    id: "01000000-0000-4000-8000-000000000003",
    question_fil: "Saan ang pinakamalapit na evacuation center?",
    question_en: "Where is the nearest evacuation centre?",
    answer_fil:
      "Nakalista sa pahinang ito ang lahat ng evacuation center kasama ang kanilang address at kapasidad. Ang pinakamalapit ay depende sa inyong purok — tanungin ang inyong barangay tanod o tingnan ang hazard map sa itaas ng pahina.",
    answer_en:
      "Every evacuation centre is listed on this site with its address and capacity. Which one is nearest depends on your purok — ask your barangay tanod or check the hazard map further up the page.",
    category: "Emergencies",
    sort_order: 3,
  },
  {
    id: "01000000-0000-4000-8000-000000000004",
    question_fil: "Ano ang ibig sabihin ng Alert Level 1, 2, at 3?",
    question_en: "What do Alert Levels 1, 2 and 3 mean?",
    answer_fil:
      "Ang Alert Level 1 ay Paghahanda — ihanda ang Go Bag at mga dokumento. Ang Alert Level 2 ay Lumikas — pumunta na sa evacuation center. Ang Alert Level 3 ay Sapilitang Paglikas — obligado nang umalis ang lahat sa apektadong lugar. Ang antas ay batay sa taas ng ilog at inaanunsyo ng barangay, hindi awtomatiko.",
    answer_en:
      "Alert Level 1 means Prepare — pack your Go Bag and documents. Alert Level 2 means Evacuate — move to an evacuation centre now. Alert Level 3 means Forced Evacuation — everyone in the affected area must leave. The level is based on river height and is announced by the barangay, never automatically.",
    category: "Emergencies",
    sort_order: 4,
  },
  {
    id: "01000000-0000-4000-8000-000000000005",
    question_fil: "Paano ako mag-uulat ng insidente o hihingi ng tulong?",
    question_en: "How do I report an incident or ask for rescue?",
    answer_fil:
      "Sa isang emergency, tumawag sa hotline ng barangay. Ito ang pinakamabilis at pinaka-maaasahang paraan. Ang online na porma para sa rescue request ay hindi pa bukas at hindi kapalit ng pagtawag.",
    answer_en:
      "In an emergency, call the barangay hotline. That is the fastest and most reliable route. The online rescue request form is not open yet, and it will not be a replacement for calling.",
    category: "Emergencies",
    sort_order: 5,
  },
  {
    id: "01000000-0000-4000-8000-000000000006",
    question_fil: "Ano ang dapat na laman ng Go Bag?",
    question_en: "What should be inside my Go Bag?",
    answer_fil:
      "Tubig at pagkain para sa tatlong araw, kopya ng mga dokumento sa selyadong plastik, regular na gamot ng bawat miyembro, flashlight, powerbank, at sipol. Basahin ang buong gabay sa seksyong Paghahanda.",
    answer_en:
      "Three days of water and food, copies of your documents sealed in plastic, each member's regular medication, a flashlight, a power bank, and a whistle. The full guide is in the Preparedness section.",
    category: "Preparedness",
    sort_order: 6,
  },
  {
    id: "01000000-0000-4000-8000-000000000007",
    question_fil: "Paano ako makakapagbigay ng donasyon?",
    question_en: "How can I donate?",
    answer_fil:
      "Tumatanggap ang barangay ng mga bagay na kailangan gaya ng pagkain, tubig, at kumot. Nakalista sa seksyong Donation Drives kung ano ang kasalukuyang kailangan. Ang barangay ay hindi tumatanggap ng pera sa pamamagitan ng website na ito.",
    answer_en:
      "The barangay accepts goods such as food, water and blankets. What is currently needed is listed in the Donation Drives section. The barangay does not accept money through this website.",
    category: "Donations",
    sort_order: 7,
  },
  {
    id: "01000000-0000-4000-8000-000000000008",
    question_fil: "Ang impormasyon ba ng aking pamilya ay makikita ng publiko?",
    question_en: "Is my family's information visible to the public?",
    answer_fil:
      "Hindi. Walang pangalan, address, o anumang detalye ng sambahayan ang lumalabas sa pampublikong pahinang ito. Ang mga numerong nakikita ninyo rito ay kabuuang bilang lamang kada lugar.",
    answer_en:
      "No. No name, address, or household detail appears anywhere on this public site. The numbers shown here are area-level totals only.",
    category: "Privacy",
    sort_order: 8,
  },
];
