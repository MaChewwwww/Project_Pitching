"use client";

import * as React from "react";
import { FileText, ShieldCheck } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UTILITY_BAR } from "@/lib/content/site";
import { NATIONAL_EMERGENCY_HOTLINE, PRIMARY_HOTLINE } from "@/lib/fixtures/hotlines";
import { APP_NAME, BARANGAY } from "@/lib/brand";

type RegistrationTermsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
};

export function RegistrationTermsDialog({
  open,
  onOpenChange,
  onAccept,
}: RegistrationTermsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-primary-200 flex h-[min(86dvh,44rem)] max-h-[calc(100dvh-2rem)] max-w-2xl flex-col gap-0 overflow-hidden bg-white p-0 shadow-2xl">
        <div className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="border-primary-100 from-primary-50 sticky top-0 z-10 shrink-0 border-b bg-gradient-to-br via-white to-emerald-50/70 px-5 py-5 pr-12 sm:px-7 sm:py-6">
            <div className="flex items-start gap-3">
              <span className="bg-primary-100 text-primary-700 border-primary-200 flex size-11 shrink-0 items-center justify-center rounded-2xl border">
                <FileText aria-hidden className="size-5" strokeWidth={2.1} />
              </span>
              <div className="min-w-0">
                <DialogTitle className="font-display text-lg font-extrabold tracking-tight text-neutral-900 sm:text-xl">
                  SAGIP-SJ Terms &amp; Conditions
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-relaxed font-medium text-neutral-500">
                  Please review the terms for creating and using a resident account.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <div className="space-y-5 text-sm leading-relaxed text-neutral-600">
              <section className="border-primary-100 bg-primary-50/60 rounded-2xl border p-4 sm:p-5">
                <h3 className="font-display text-primary-900 text-sm font-extrabold">
                  Agreement To Our Legal Terms
                </h3>
                <p className="mt-2">
                  {APP_NAME} is the System for Alert, Guidance, Incident Reporting, and
                  Preparedness for {BARANGAY}. It provides
                  public information and resident account features for preparedness,
                  community coordination, incident reporting, and emergency response.
                </p>
                <p className="mt-3">
                  By creating an account or using an account-only feature, you confirm
                  that you have read, understood, and agree to these Terms &amp;
                  Conditions. If you do not agree, do not create an account or use
                  account-only features. Public information may remain available without
                  registration.
                </p>
              </section>

              <section>
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  Table Of Contents
                </h3>
                <ol className="marker:text-primary-600 mt-2 grid list-decimal gap-x-6 gap-y-1.5 pl-5 text-xs font-semibold text-primary-800 sm:grid-cols-2">
                  {[
                    ["our-services", "Our Services"],
                    ["intellectual-property", "Intellectual Property Rights"],
                    ["user-representations", "User Representations"],
                    ["user-registration", "User Registration"],
                    ["prohibited-activities", "Prohibited Activities"],
                    ["user-contributions", "User Generated Contributions"],
                    ["contribution-license", "Contribution License"],
                    ["third-party-content", "Third-Party Websites And Content"],
                    ["advertisers", "Advertisers And Fundraising Notices"],
                    ["privacy", "Privacy And Personal Information"],
                    ["term-termination", "Term And Termination"],
                    ["modifications", "Modifications And Interruptions"],
                    ["governing-law", "Governing Law"],
                    ["dispute-resolution", "Dispute Resolution"],
                    ["corrections", "Corrections"],
                    ["disclaimer", "Disclaimer"],
                    ["liability", "Limitations Of Liability"],
                    ["indemnification", "Indemnification"],
                    ["user-data", "User Data"],
                    ["electronic-communications", "Electronic Communications"],
                    ["miscellaneous", "Miscellaneous"],
                    ["contact", "Contact Us"],
                  ].map(([id, label]) => (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className="hover:text-primary-600 underline-offset-2 hover:underline"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ol>
              </section>

              <section id="our-services" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  1. Our Services
                </h3>
                <p className="mt-2">
                  The Services include the public website, announcements, activities,
                  preparedness guides, hazard maps, weather and river information,
                  evacuation and facility information, donation notices, hotlines,
                  resident accounts, household preparedness tools, incident reports, and
                  emergency assistance workflows made available by Barangay San Jose.
                </p>
                <p className="mt-3">
                  Information is provided for community preparedness and coordination. It
                  may be delayed, incomplete, changed, or unavailable because of weather,
                  connectivity, maintenance, source-data limitations, or events outside
                  the barangay&apos;s control. The Services do not replace instructions from
                  barangay officials, emergency responders, medical professionals, or
                  other competent authorities.
                </p>
                <p className="mt-3">
                  You are responsible for following applicable laws and regulations when
                  using the Services. Access from outside Barangay San Jose is at your
                  own initiative and does not create an obligation for the barangay to
                  provide services outside its authority or operational capacity.
                </p>
              </section>

              <section id="intellectual-property" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  2. Intellectual Property Rights
                </h3>
                <p className="mt-2">
                  The SAGIP-SJ name, service design, source code, databases, workflows,
                  original text, graphics, logos, and other materials created for the
                  Services are owned by or licensed to the barangay or its project team.
                  Third-party map, hazard, weather, and other data remain subject to their
                  respective licenses and attribution requirements.
                </p>
                <p className="mt-3">
                  Subject to these Terms, you may view and print public information for
                  personal, non-commercial preparedness and community use. You may not
                  copy, scrape, republish, sell, modify, frame, reverse engineer, or
                  commercially exploit the Services or their protected materials without
                  prior written permission, except where applicable law or an open license
                  expressly allows it.
                </p>
              </section>

              <section id="user-representations" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  3. User Representations
                </h3>
                <ul className="marker:text-primary-500 mt-2 list-disc space-y-2 pl-5">
                  <li>All information you provide is truthful, accurate, current, and complete.</li>
                  <li>You will update information when it changes or correct errors you discover.</li>
                  <li>You have authority to submit information about yourself and any household member or location you include.</li>
                  <li>You have the legal capacity to accept these Terms or have the permission of a parent or legal guardian where required.</li>
                  <li>You will use the Services only for lawful, authorized, and community-safe purposes.</li>
                  <li>You will not access the Services through bots, scripts, scraping tools, or other automated means without written permission.</li>
                </ul>
                <p className="mt-3">
                  We may suspend or terminate an account that contains materially false,
                  misleading, incomplete, or unauthorized information, subject to
                  applicable law and any required government records process.
                </p>
              </section>

              <section id="user-registration" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  4. User Registration
                </h3>
                <p className="mt-2">
                  Some Services require a resident account. You must provide the required
                  registration information and keep your sign-in credentials confidential.
                  You are responsible for activity performed through your account unless
                  you promptly report unauthorized access and cooperate with account
                  security steps.
                </p>
                <ul className="marker:text-primary-500 mt-2 list-disc space-y-2 pl-5">
                  <li>Use one account for yourself and do not create accounts under false or borrowed identities.</li>
                  <li>Do not share passwords, verification codes, or portal access with another person.</li>
                  <li>Notify Barangay San Jose as soon as possible if you suspect compromise or misuse.</li>
                  <li>Do not attempt to obtain resident, staff, responder, or administrator privileges that were not assigned to you.</li>
                </ul>
              </section>

              <section id="prohibited-activities" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  5. Prohibited Activities
                </h3>
                <p className="mt-2">You may not use the Services to:</p>
                <ul className="marker:text-primary-500 mt-2 list-disc space-y-2 pl-5">
                  <li>Submit false, malicious, duplicate, abusive, or intentionally misleading incident reports, household records, or requests.</li>
                  <li>Impersonate a resident, official, responder, organization, or another person.</li>
                  <li>Harass, threaten, discriminate against, dox, expose, or endanger another person.</li>
                  <li>Upload content that is unlawful, defamatory, hateful, obscene, sexually explicit, violent, invasive of privacy, or harmful to minors.</li>
                  <li>Upload malware, viruses, tracking mechanisms, or material intended to disrupt the Services.</li>
                  <li>Probe, bypass, disable, or interfere with authentication, access controls, security features, rate limits, or emergency workflows.</li>
                  <li>Harvest contact details, scrape data, create databases, send spam, or use the Services for unauthorized advertising or commercial solicitation.</li>
                  <li>Use an emergency form for a non-emergency, obstruct dispatch, or knowingly misuse emergency hotline information. For immediate danger, call 911.</li>
                  <li>Copy, adapt, reverse engineer, or distribute the Services or protected Content except as permitted by these Terms, an applicable license, or law.</li>
                  <li>Use information from the Services to harm, defraud, stalk, or target another person or household.</li>
                </ul>
              </section>

              <section id="user-contributions" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  6. User Generated Contributions
                </h3>
                <p className="mt-2">
                  Where the Services allow you to submit incident details, feedback,
                  photos, documents, household information, or other material, that
                  material is a Contribution. Contributions may be reviewed by authorized
                  barangay personnel and may be shared with responders or other officials
                  when needed for safety, verification, service delivery, or legal duties.
                </p>
                <p className="mt-3">
                  Do not include another person&apos;s sensitive information, image, or
                  location unless you are authorized to provide it or it is necessary for
                  an emergency report. You represent that your Contributions are accurate,
                  lawful, non-confidential unless explicitly marked and handled as such,
                  and do not infringe another person&apos;s rights.
                </p>
                <p className="mt-3">
                  We may review, redact, restrict, remove, or preserve Contributions when
                  reasonably necessary for safety, moderation, privacy, records retention,
                  investigation, or compliance. We are not required to publish or retain
                  every Contribution.
                </p>
              </section>

              <section id="contribution-license" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  7. Contribution License
                </h3>
                <p className="mt-2">
                  You retain ownership of Contributions you lawfully own. By submitting a
                  Contribution, you grant Barangay San Jose a non-exclusive, royalty-free,
                  worldwide license to host, store, reproduce, process, format, display,
                  and share it only as reasonably necessary to operate the Services,
                  verify reports, coordinate preparedness or response, communicate with
                  you, meet legal duties, and publish official community information.
                </p>
                <p className="mt-3">
                  This license continues for as long as necessary for the purposes above,
                  including lawful records retention. It does not give the barangay
                  ownership of your private household information, and it does not permit
                  unrelated commercial use of your personal information. You are
                  responsible for obtaining permission for people, images, documents, or
                  other material included in your Contribution.
                </p>
              </section>

              <section id="third-party-content" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  8. Third-Party Websites And Content
                </h3>
                <p className="mt-2">
                  The Services may link to or display information from third parties,
                  including map providers, weather and river-data sources, social-media
                  pages, donation organizers, and other public websites. Third-party
                  content is provided for convenience and may be incomplete, changed, or
                  governed by separate terms and privacy practices.
                </p>
                <p className="mt-3">
                  A link or displayed source does not necessarily mean that Barangay San
                  Jose endorses the third party, guarantees its content, or accepts
                  responsibility for its products, services, transactions, or security.
                  Review the third party&apos;s terms before leaving the Services or sharing
                  information with it.
                </p>
              </section>

              <section id="advertisers" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  9. Advertisers And Fundraising Notices
                </h3>
                <p className="mt-2">
                  The Services may display community notices, organizer information, or
                  fundraising and donation-drive details. Listing a notice does not by
                  itself guarantee an organizer, result, product, service, or donation
                  outcome. Verify drop-off instructions and organizer details through the
                  official Barangay San Jose channels before acting.
                </p>
                <p className="mt-3">
                  SAGIP-SJ does not process donations, payments, or purchases through the
                  platform unless a future notice expressly states otherwise. Never send
                  money or sensitive financial information based only on an unverified
                  message, link, or account.
                </p>
              </section>

              <section id="privacy" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  10. Privacy And Personal Information
                </h3>
                <p className="mt-2">
                  The Services may collect information needed to create and secure an
                  account, communicate with residents, manage households, understand
                  location and vulnerability needs, verify reports, and coordinate
                  preparedness or response. This may include identity, contact, household,
                  location, accessibility, vulnerability, and account-use information.
                </p>
                <ul className="marker:text-primary-500 mt-2 list-disc space-y-2 pl-5">
                  <li>Provide only information that is necessary, accurate, and authorized.</li>
                  <li>Review any notice shown when information is collected and follow the barangay&apos;s applicable privacy process.</li>
                  <li>Understand that information may be accessed by authorized personnel and shared with responders or government offices when necessary for safety, service delivery, or law.</li>
                  <li>Do not use another person&apos;s account or submit another person&apos;s information without authority.</li>
                </ul>
                <p className="mt-3">
                  Privacy and data requests may be directed through the official Barangay
                  San Jose contact channels. Some records may need to be retained for
                  emergency response, accountability, public records, or legal compliance.
                </p>
              </section>

              <section id="term-termination" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  11. Term And Termination
                </h3>
                <p className="mt-2">
                  These Terms apply while you access or use the Services. We may suspend,
                  restrict, or terminate access, with or without notice when permitted by
                  law, if you breach these Terms, provide false information, misuse an
                  emergency workflow, threaten another person, compromise security, or
                  create legal, operational, or safety risk.
                </p>
                <p className="mt-3">
                  You may stop using the Services at any time. Ending an account does not
                  automatically remove records that the barangay must retain for safety,
                  investigation, public accountability, or legal compliance. Provisions
                  concerning ownership, Contributions, privacy, disclaimers, liability,
                  indemnification, and dispute resolution continue as applicable.
                </p>
              </section>

              <section id="modifications" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  12. Modifications And Interruptions
                </h3>
                <p className="mt-2">
                  We may add, remove, change, suspend, or discontinue a feature, notice,
                  data source, or part of the Services when operational, technical, legal,
                  safety, or funding conditions require it. We may also perform maintenance
                  that causes delays, errors, or temporary unavailability.
                </p>
                <p className="mt-3">
                  We may revise these Terms when the Services, applicable law, or barangay
                  processes change. Material changes may be communicated through the
                  Services or other reasonable channels. Continued use after a revision
                  means you accept the revised Terms. If you do not agree, stop using
                  account-only Services and contact the barangay about your account.
                </p>
              </section>

              <section id="governing-law" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  13. Governing Law
                </h3>
                <p className="mt-2">
                  These Terms and your use of the Services are governed by the laws of the
                  Republic of the Philippines and applicable ordinances and regulations
                  governing {BARANGAY}, without limiting rights
                  that cannot lawfully be waived.
                </p>
              </section>

              <section id="dispute-resolution" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  14. Dispute Resolution
                </h3>
                <p className="mt-2">
                  If you have a concern about the Services, first contact Barangay San
                  Jose through the official channels so the issue can be reviewed and
                  resolved in good faith. Provide enough information for the barangay to
                  identify the account, report, notice, or transaction involved.
                </p>
                <p className="mt-3">
                  Nothing in this section prevents you from contacting an emergency
                  responder, regulator, law-enforcement office, court, or other authority
                  when necessary, or from exercising a right that cannot be waived under
                  Philippine law. Urgent safety, privacy, or security matters may require
                  immediate action instead of informal resolution.
                </p>
              </section>

              <section id="corrections" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  15. Corrections
                </h3>
                <p className="mt-2">
                  The Services may contain typographical errors, outdated schedules,
                  incomplete descriptions, incorrect locations, data-source limitations,
                  or other inaccuracies. We may correct, update, or remove information
                  without prior notice. If you find an urgent or safety-critical error,
                  contact Barangay San Jose directly and do not rely on the incorrect
                  information while waiting for a correction.
                </p>
              </section>

              <section id="disclaimer" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  16. Disclaimer
                </h3>
                <p className="mt-2 font-semibold text-neutral-800 uppercase">
                  The Services are provided on an as-is and as-available basis to the
                  fullest extent permitted by law.
                </p>
                <p className="mt-3">
                  We do not guarantee that alerts, maps, weather readings, river levels,
                  reports, hotline listings, schedules, evacuation information, or other
                  Content will always be accurate, complete, current, secure, uninterrupted,
                  or suitable for every situation. Information from a third party may
                  change or fail without notice.
                </p>
                <p className="mt-3">
                  The Services are not a substitute for emergency dispatch, medical care,
                  professional advice, or direct instructions from authorities. For
                  immediate danger, call {NATIONAL_EMERGENCY_HOTLINE.number}. For
                  barangay information and coordination, use the official Barangay San
                  Jose hotline listed in the Hotline
                  Directory.
                </p>
              </section>

              <section id="liability" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  17. Limitations Of Liability
                </h3>
                <p className="mt-2">
                  To the fullest extent permitted by law, Barangay San Jose, its officers,
                  employees, volunteers, project team, service providers, and data
                  partners will not be liable for indirect, incidental, special,
                  consequential, exemplary, or punitive loss arising from access to or
                  inability to access the Services, reliance on Content, third-party
                  services, unauthorized access, outages, delayed notices, or user
                  Contributions.
                </p>
                <p className="mt-3">
                  Nothing in these Terms excludes or limits liability that cannot be
                  excluded or limited under applicable law, including liability arising
                  from fraud, willful misconduct, or other non-waivable rights.
                </p>
              </section>

              <section id="indemnification" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  18. Indemnification
                </h3>
                <p className="mt-2">
                  To the extent permitted by law, you agree to be responsible for claims,
                  losses, damage, or reasonable costs arising from your unlawful use of the
                  Services, your breach of these Terms, your Contributions, your violation
                  of another person&apos;s rights, or your intentional misuse of an emergency
                  or reporting workflow. This does not transfer the barangay&apos;s official
                  duties to you or limit any right you have under law.
                </p>
              </section>

              <section id="user-data" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  19. User Data
                </h3>
                <p className="mt-2">
                  We use reasonable operational safeguards and routine backups appropriate
                  to a community platform, but no system can guarantee that data will never
                  be lost, corrupted, delayed, or accessed without authorization. You are
                  responsible for the accuracy of information you submit and should retain
                  copies of important personal records.
                </p>
                <p className="mt-3">
                  We may preserve account, report, household, system, and communication
                  records for response coordination, security, audit, public accountability,
                  or legal requirements. Requests to correct, restrict, or delete data are
                  subject to applicable privacy rights, operational needs, and required
                  retention periods.
                </p>
              </section>

              <section id="electronic-communications" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  20. Electronic Communications, Transactions, And Signatures
                </h3>
                <p className="mt-2">
                  Visiting the Services, submitting a form, sending a message, checking a
                  consent box, or selecting an acceptance button creates an electronic
                  communication. You consent to receive account, security, service, and
                  policy notices electronically through the Services or the contact details
                  you provide.
                </p>
                <p className="mt-3">
                  You agree that electronic records, confirmations, acknowledgements, and
                  signatures may satisfy writing or signature requirements where permitted
                  by law. Keep your contact details current and do not treat a successful
                  submission as proof that a response, rescue dispatch, donation, or other
                  real-world service has been completed.
                </p>
              </section>

              <section id="miscellaneous" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  21. Miscellaneous
                </h3>
                <p className="mt-2">
                  These Terms, together with any notices or policies shown with a specific
                  feature, form the agreement governing your use of the Services. If a
                  provision is found invalid or unenforceable, the remaining provisions
                  remain effective. A failure to enforce a provision is not a waiver of
                  that provision.
                </p>
                <p className="mt-3">
                  These Terms do not create an employment, agency, partnership, or joint
                  venture relationship between you and Barangay San Jose. We are not
                  responsible for delay or failure caused by events beyond reasonable
                  control, including disasters, outages, telecommunications failures,
                  cyber incidents, government action, or failures of third-party sources.
                </p>
              </section>

              <section id="contact" className="scroll-mt-4">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  22. Contact Us
                </h3>
                <p className="mt-2">
                  For questions, privacy requests, corrections, account concerns, or
                  complaints about the Services, contact Barangay San Jose through the
                  official channels published in the Hotline Directory.
                </p>
                <div className="border-primary-100 bg-primary-50/60 mt-3 rounded-xl border px-4 py-3 text-xs font-semibold text-primary-900">
                  <p>{UTILITY_BAR.address}</p>
                  <p className="mt-1">{UTILITY_BAR.officeHours}</p>
                  <p className="mt-1">
                    {PRIMARY_HOTLINE.label}: {PRIMARY_HOTLINE.number}
                  </p>
                  <p className="mt-1">
                    {NATIONAL_EMERGENCY_HOTLINE.label}: {NATIONAL_EMERGENCY_HOTLINE.number}
                  </p>
                </div>
              </section>

              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
                You can close this window without agreeing. Selecting “Accept terms”
                confirms that you agree to these Terms &amp; Conditions and enables account
                creation. This acceptance does not replace any separate consent required
                when you submit household, location, vulnerability, or incident data.
              </p>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 flex shrink-0 flex-col-reverse gap-2 border-t border-neutral-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <Button
              type="button"
              variant="outline"
              pill
              size="md"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Not now
            </Button>
            <Button
              type="button"
              pill
              size="md"
              onClick={onAccept}
              className="w-full gap-2 sm:w-auto"
            >
              <ShieldCheck aria-hidden className="size-4" />
              Accept terms
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
