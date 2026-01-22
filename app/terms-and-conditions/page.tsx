import { Metadata } from 'next';

import Noise from '@/components/noise';

export const metadata: Metadata = {
  title: 'Terms of Use | Trialetics',
  description: 'Terms of Use for Trialetics Clinical Trial Management System (CTMS). Effective February 8, 2025.',
};

export default function TermsOfUse() {
  return (
    <section className="section-padding relative">
      <Noise />
      <div className="container max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-4xl font-medium tracking-tighter md:text-5xl lg:text-6xl">
              Terms of Use
            </h1>
            <div className="text-muted-foreground space-y-1 text-sm">
              <p><strong>Policy Version Date:</strong> January 8, 2025</p>
              <p><strong>Policy Effective Date:</strong> February 8, 2025</p>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-muted/50 border-l-4 border-primary p-6 rounded-r-lg">
            <p className="text-sm leading-relaxed">
              <strong>IMPORTANT:</strong> These Trialetics Technologies, LLC Terms of Use (TOU) create a legally binding agreement between you and Trialetics Technologies, LLC. Please review these terms carefully before using the services offered by Trialetics Technologies, LLC. By creating an account or by using the services in any manner, you agree that you have read and agree to be bound by and a party to these terms.
            </p>
          </div>

          {/* Main Content */}
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-12">
            
            {/* Section 1 */}
            <section id="services" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">1. The Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                Trialetics provides the Trialetics product, our online, on-demand, software-as-a-service Clinical Trial Management System (CTMS) and Electronic Trial Master File (eTMF) product located at https://www.trialetics.io/ and associated subdomains ("Trialetics Modules") and our related content, features, applications, and other services (collectively with Trialetics, the "Service(s)"). In addition to our core CTMS platform, Trialetics offers custom software development services and Excel to SaaS conversion services, transforming spreadsheet-based workflows into scalable, compliant software solutions tailored to the unique needs of clinical trial operations. We also provide ready-to-use modules available through our App Store, offering immediate deployment of pre-built solutions for common clinical trial management needs without the time and cost of custom development.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The Service allows Clients and their individual employees and contractors (or any other individuals designated by Client) who require access to the Services ("Authorized Users") to perform detailed clinical trial management activities in the pharmaceutical, biotechnology, medical device and life sciences industries. This includes contacts and organizations, calendars, tasks and milestones, contracts and payments, performance targets and metrics, documents, monitoring activities, and study subject metadata.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong>IMPORTANT:</strong> This does not include case report forms, randomization, electronic health records storage or processing, or the collection of Protected Health Information ("PHI") as that term is defined under the Health Insurance Portability and Accountability Act of 1996 and the regulations promulgated thereunder ("HIPAA").
              </p>
              <p className="text-muted-foreground leading-relaxed">
                You can browse our websites pursuant to these Terms. Organizations that wish to access Trialetics need to enter into a Master Services Agreement or similar agreement ("Agreement") and complete the registration process to create an account for the organization ("Client") and each of the Client's Authorized Users. Notwithstanding anything to the contrary herein, in the event any agreement you or the legal entity you represent may have with Trialetics regarding the Service conflicts with these Terms, that agreement (and not these Terms) will prevail to the extent necessary to resolve the inconsistency or conflict.
              </p>
            </section>

            {/* Section 2 */}
            <section id="additional-terms" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">2. Additional Terms and Policies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your use of our Service is subject to our Privacy Policy for Web Visitors and our Privacy Policy for Subscribers, as applicable. By accessing our websites or using the Service, you consent to these policies, to the extent applicable to you, and you also agree to abide by any other policies or guidance we may post or otherwise make available from time to time which, to the extent indicated as being mandatory in such policy, are hereby incorporated by reference into these Terms (collectively "Company Policies").
              </p>
            </section>

            {/* Section 3 */}
            <section id="modifications" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">3. Modifications</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the extent allowed by law, Trialetics reserves the right, in its sole discretion, to modify these Terms or our Company Policies at any time, with email notification to Clients no less than thirty (30) days prior to the effective date of the change. Notification will be provided to all Authorized Users with an active account, as well as an optional Client email address that can be populated within the subscription settings of the Service.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                You should review these Terms and our Company Policies regularly. Given the thirty (30) day notice, your continued use of the Service on or after the effective date of modifications to these Terms constitutes acceptance of those changes. If you object to any such changes, your sole recourse is to stop using our Service.
              </p>
            </section>

            {/* Section 4 */}
            <section id="eligibility" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">4. Authorized User Eligibility</h2>
              <p className="text-muted-foreground leading-relaxed">
                To access certain Services, including the Trialetics Modules, you must create an individual account as described below. Trialetics offers its Service for business purposes, and not for personal, household, or consumer use. All Authorized Users must be of legal age in the jurisdiction in which they reside and capable of forming a binding contract with us.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By creating an account, you agree to abide by these terms. Trialetics reserves the right, in its sole discretion, to refuse, suspend, or terminate access to the Service upon discovery that any information provided is not true, accurate, or complete, or otherwise violates these Terms.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                You may not create an account if you are: (a) a citizen or resident of a geographic area in which access or use of the Service is prohibited by applicable law; (b) a citizen or resident of an area subject to U.S. or other sanctions or embargoes; or (c) identified on U.S. sanctioned or denied persons lists.
              </p>
            </section>

            {/* Section 5 */}
            <section id="user-accounts" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">5. Authorized User Accounts</h2>
              <p className="text-muted-foreground leading-relaxed">
                To use the Service, you must create a unique account by providing a unique email address, selecting a password, and providing accurate, current and complete information. You must maintain and promptly update this information to keep it accurate.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                If a Client provided you with your account, you understand that this Client has rights to your account and may: (a) manage your account; (b) reset your password; (c) view your usage data; and (d) view and manage the content you enter into the Service.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Important:</strong> Use of a single Authorized User account by multiple people is prohibited. You are responsible for all activity that occurs on your account and must maintain the confidentiality of your password. You must notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            {/* Section 6 */}
            <section id="privacy-security" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">6. Privacy and Data Security</h2>
              
              <div className="space-y-6 ml-4">
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">A. General</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    You and Trialetics shall each comply with all laws and regulations applicable to the processing of personal data under this Agreement ("Applicable Data Protection Law"). This includes data protection laws of the European Union, United Kingdom, United States, and individual states.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">B. Privacy</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Our privacy policies are hereby incorporated into and form an integral part of these Terms. Where processing is based on consent and to the extent permitted by law, by entering into these Terms, you consent to Trialetics's collection, use, and disclosure of your personal data as described in the applicable privacy policy.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">C. Data</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    You represent and warrant that to the extent any Client Data includes personal data, you have provided all required notices and obtained all required consents. You are solely responsible for the accuracy, quality, and legality of any Client Data you provide.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">YOU AGREE NOT TO PROVIDE ANY SENSITIVE DATA OR PHI VIA THE SERVICE.</strong> Sensitive data means personal data revealing racial or ethnic origin, political opinions, religious beliefs, trade union membership, genetic data, biometric data, health data, sex life, sexual orientation, or criminal convictions.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">D. Compliance with Laws</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    You warrant that you shall not use our Service in violation of any applicable laws or regulations. You acknowledge that we do not pre-screen Client Data and cannot directly influence how you use our Service. You control and are solely responsible for the internal management and administration of the Service.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section id="unauthorized-use" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">7. Unauthorized Use of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                You acknowledge and agree that you must not, and you must not authorize or encourage any third party to:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4 text-muted-foreground">
                <li>Use another individual's account or share your password with any unauthorized person</li>
                <li>Attempt to decipher, decompile, or reverse engineer the Service software</li>
                <li>Modify, adapt, or hack the Service or attempt unauthorized access</li>
                <li>Defame, abuse, harass, stalk, threaten, or violate the legal rights of others</li>
                <li>Transmit any unlawful, defamatory, obscene, or inappropriate content</li>
                <li>Transmit content that infringes intellectual property rights</li>
                <li>Transmit files containing viruses or harmful programs</li>
                <li>Use the Service for unauthorized commercial purposes</li>
                <li>Transmit spam, unsolicited advertising, or chain letters</li>
                <li>Download files that cannot be legally obtained</li>
                <li>Falsify author attributions or proprietary notices</li>
                <li>Restrict or inhibit other users from using the Service</li>
                <li>Collect or store personal data beyond business requirements</li>
                <li>Interfere with or disrupt the Service, servers, or networks</li>
                <li>Perform unauthorized testing on production environments</li>
                <li>Impersonate any person or entity</li>
                <li>Use the Service for unlawful purposes</li>
                <li>Store or transmit PHI, sensitive data, or improperly obtained personal data</li>
              </ol>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong>YOU MAY USE THE SERVICE ONLY FOR LAWFUL AND APPROPRIATE INTERNAL BUSINESS PURPOSES.</strong> We reserve the right to suspend or permanently deactivate your account for violations. Trialetics will be entitled to seek injunctive relief for serious violations without the need to prove damages.
              </p>
            </section>

            {/* Section 8 */}
            <section id="third-party" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">8. Third Party Websites</h2>
              <p className="text-muted-foreground leading-relaxed">
                As part of the Service, Trialetics may provide links to third-party websites ("Third-Party Sites") and content or items from third parties ("Third-Party Applications, Software or Content"). These links are provided as a courtesy. Trialetics has no control over and is not responsible for Third-Party Sites or Third-Party Applications, Software or Content.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Inclusion of or linking to any Third-Party Site does not imply approval or endorsement by Trialetics. If you access Third-Party Sites or use Third-Party Applications, you do so at your own risk. Our terms and policies no longer govern once you leave the Service.
              </p>
            </section>

            {/* Section 9 */}
            <section id="digital-signature" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">9. Digital Signature</h2>
              <p className="text-muted-foreground leading-relaxed">
                By registering to use Trialetics's Service, you are deemed to have executed these Terms electronically, pursuant to applicable electronic signature laws including the U.S. Electronic Signatures in Global and National Commerce Act (15 U.S.C. § 7001, et seq.). Your registration constitutes acknowledgement that you can electronically receive, download, and print these Terms.
              </p>
            </section>

            {/* Section 10 */}
            <section id="electronic-records" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">10. Consent to Use Electronic Records</h2>
              <p className="text-muted-foreground leading-relaxed">
                In connection with these Terms, you may be entitled to receive certain records in writing. To facilitate your use of the Service, you give us permission to provide these records to you electronically instead of in paper form.
              </p>
            </section>

            {/* Section 11 */}
            <section id="withdraw-consent" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">11. Right to Withdraw Consent</h2>
              <p className="text-muted-foreground leading-relaxed">
                By registering to use Trialetics's Services, you consent to electronically receive and access, via email or the Service, all records and notices. Trialetics will generally communicate with you electronically; however, we reserve the right to communicate via U.S. Postal Service using your registered address.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Your consent will remain in effect until you withdraw it by cancelling your subscription. To ensure Trialetics can provide records electronically, you must maintain your email address in the application.
              </p>
            </section>

            {/* Section 12 */}
            <section id="term" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">12. Term</h2>
              <p className="text-muted-foreground leading-relaxed">
                This Agreement commences upon the date you create an account or otherwise begin using the Service. Data related to your account remains available until the Agreement with the Client has been terminated or your access is terminated by the Client.
              </p>
            </section>

            {/* Section 13 */}
            <section id="license" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">13. License</h2>
              
              <div className="space-y-6 ml-4">
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">A. Trialetics Intellectual Property</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    The Service, along with all content and materials therein, including the Trialetics logo, designs, text, graphics, data, software, and other files (collectively, the "Materials") are the intellectual and proprietary property of Trialetics or its licensors. All Materials are protected by U.S. and international copyright laws. Trialetics maintains all rights, title, and interest in and to the Service and Materials.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">B. License to the Service</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Authorized Users are granted a limited, non-exclusive, non-sublicensable, non-transferable license to access and use the Service solely for authorized purposes ("License"). This License does not include:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                    <li>Unauthorized distribution, public performance, or public display of Materials</li>
                    <li>Modifying or making derivative uses of the Service</li>
                    <li>Use of data mining, robots, or similar extraction methods</li>
                    <li>Downloading Materials except as expressly permitted</li>
                    <li>Any use other than the Service's intended purpose</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-3">
                    Any unauthorized use is strictly prohibited and will terminate the License. Upon termination or expiration of the Agreement, this license shall be revoked.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">C. License to Client Data</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    You or the Client grant Trialetics a non-exclusive license to host, copy, process, transmit, and display data you submit via the Service solely for providing the Service. Subject to this limited license, Client retains all right, title, and interest in the Client Data.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">D. Feedback</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    You grant Trialetics a royalty-free, worldwide, transferrable, sublicensable, irrevocable, perpetual license to use any feedback you provide relating to the Service. This license continues after termination of these Terms.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 14 */}
            <section id="trademarks" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">14. Trademarks and Copyrights</h2>
              <p className="text-muted-foreground leading-relaxed">
                "Trialetics Technologies LLC", "Trialetics", the Trialetics logos and any other product or service names contained in the Service are trademarks of Trialetics and may not be copied, imitated or used without prior written permission. You may not use metatags or hidden text utilizing "Trialetics Technologies" or related names without authorization.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The look and feel of the Service, including page headers, custom graphics, reports, and document templates, are the service mark, trademark, trade dress and/or copyright of Trialetics and may not be copied without permission.
              </p>
            </section>

            {/* Section 15 */}
            <section id="export-control" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">15. Export Control</h2>
              <p className="text-muted-foreground leading-relaxed">
                This Service and Materials may be subject to U.S. export control and economic sanctions laws. Trialetics makes no representation that materials are appropriate or available for use outside the United States. Those who access the Service from other locations do so on their own initiative and are responsible for compliance with applicable laws and regulations.
              </p>
            </section>

            {/* Section 16 */}
            <section id="support" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">16. Support & Service Level</h2>
              <p className="text-muted-foreground leading-relaxed">
                All Authorized Users receive support via email and web during regular business hours (8 AM – 5 PM Central Time, in English). Phone support is not included as a core service but may be available through Professional Services.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Additional support details, including Service Level Availability (SLA) terms and support ticket classifications, are available per the Master Services Agreement governing your use of the Service.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                An "Error" means a material failure of the Service to perform as documented. Trialetics's responsibility is to use commercially reasonable efforts to correct reported Errors, which may consist of patches, workarounds, or inclusion in future releases.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Trialetics reserves the right to change or upgrade equipment, software, or features without notice. We will install security patches and updates as determined in our sole discretion. Downgrade of the Service by the Client may cause loss of features, content, or capacity.
              </p>
            </section>

            {/* Section 17 */}
            <section id="technical-requirements" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">17. Technical Requirements</h2>
              <p className="text-muted-foreground leading-relaxed">
                Authorized Users must access the Service via high-speed internet connection of at least 10 Mbps down and 2 Mbps up (recommended speeds: 50 Mbps down and 10 Mbps up). You must enable cookies in your web browser to use the Service.
              </p>
              
              <div className="bg-muted/30 p-4 rounded-lg space-y-3 mt-4">
                <p className="text-sm font-semibold">Supported Platforms and Browsers:</p>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>Windows 10 and above:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Google Chrome – latest and prior major version (Recommended)</li>
                    <li>Microsoft Edge – latest and prior major version</li>
                  </ul>
                  
                  <p className="mt-3"><strong>macOS 10.14 and above:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Google Chrome – latest and prior major version (Recommended)</li>
                    <li>Apple Safari – latest and prior major version</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 18 */}
            <section id="warranty" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">18. Mutual Warranty</h2>
              <p className="text-muted-foreground leading-relaxed">
                Each Party warrants and represents that it has the right to enter into and perform its obligations under these Terms.
              </p>
            </section>

            {/* Section 19 */}
            <section id="indemnification" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">19. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to defend, indemnify and hold harmless Trialetics, its contractors, service providers, consultants, and their respective directors, employees, agents, partners and affiliates from and against any claims, damages, costs, liabilities and expenses (including reasonable attorneys' fees) arising out of or related to:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of the rights of any third party</li>
              </ul>
            </section>

            {/* Section 20 */}
            <section id="disclaimer" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">20. Disclaimer</h2>
              <div className="bg-amber-500/10 border-l-4 border-amber-500 p-6 rounded-r-lg">
                <p className="text-sm leading-relaxed">
                  <strong>EXCEPT AS EXPRESSLY PROVIDED IN THESE TERMS, THE SERVICE AND MATERIALS ARE PROVIDED ON AN "AS IS" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.</strong> Trialetics disclaims all other warranties, including implied warranties of merchantability, fitness for a particular purpose, title and non-infringement.
                </p>
                <p className="text-sm leading-relaxed mt-3">
                  Trialetics does not warrant that materials are accurate, complete, reliable, current or error-free. Trialetics does not warrant that the Service or its servers are free of viruses or other harmful components. While we attempt to make your access safe, you should use industry-recognized software to detect and disinfect viruses.
                </p>
              </div>
            </section>

            {/* Section 21 */}
            <section id="service-availability" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">21. Service Availability and Data Loss</h2>
              <div className="bg-orange-500/10 border-l-4 border-orange-500 p-6 rounded-r-lg space-y-3">
                <p className="text-sm leading-relaxed">
                  <strong>TRIALETICS MAKES NO GUARANTEES REGARDING SERVICE AVAILABILITY, UPTIME, OR UNINTERRUPTED ACCESS.</strong> The Service may be temporarily unavailable due to scheduled maintenance, upgrades, emergency repairs, or circumstances beyond our control including but not limited to internet service provider failures, natural disasters, or third-party service disruptions.
                </p>
                <p className="text-sm leading-relaxed">
                  <strong>TRIALETICS SHALL NOT BE LIABLE FOR ANY LOSS OF DATA, LOSS OF PRODUCTIVITY, LOSS OF BUSINESS OPPORTUNITY, OR ANY OTHER LOSSES OR DAMAGES ARISING FROM SERVICE DOWNTIME, INTERRUPTIONS, OR UNAVAILABILITY.</strong> You acknowledge that temporary service interruptions are an inherent aspect of cloud-based software systems.
                </p>
                <p className="text-sm leading-relaxed">
                  You are solely responsible for maintaining adequate backup copies of your Client Data. Trialetics strongly recommends that you regularly export and backup all critical data stored in the Service. While we maintain backup systems as part of our infrastructure, we do not guarantee the ability to restore data in all circumstances and are not responsible for data loss resulting from any cause including user error, system failure, or malicious acts.
                </p>
                <p className="text-sm leading-relaxed">
                  Any Service Level Availability (SLA) terms, if applicable, are defined in your Master Services Agreement and represent the sole and exclusive remedy for service availability issues. No additional compensation, refunds, or damages will be available beyond those explicitly stated in the applicable SLA.
                </p>
              </div>
            </section>

            {/* Section 22 */}
            <section id="liability" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">22. Limitation of Liability</h2>
              <div className="bg-red-500/10 border-l-4 border-red-500 p-6 rounded-r-lg space-y-3">
                <p className="text-sm leading-relaxed">
                  <strong>IN NO EVENT SHALL TRIALETICS BE LIABLE FOR ANY DIRECT, SPECIAL, INDIRECT OR CONSEQUENTIAL DAMAGES, OR ANY OTHER DAMAGES OF ANY KIND, INCLUDING BUT NOT LIMITED TO LOSS OF USE, LOSS OF PROFITS OR LOSS OF DATA, WHETHER IN AN ACTION IN CONTRACT, TORT OR OTHERWISE, ARISING OUT OF OR IN ANY WAY CONNECTED WITH THE USE OF OR INABILITY TO USE THE SERVICE.</strong>
                </p>
                <p className="text-sm leading-relaxed">
                  This includes damages caused by reliance on information obtained from Trialetics, or resulting from mistakes, omissions, interruptions, errors, defects, viruses, delays in operation or transmission, or any failure of performance.
                </p>
                <p className="text-sm leading-relaxed">
                  <strong>IN NO EVENT SHALL THE AGGREGATE LIABILITY OF TRIALETICS EXCEED ANY FEES PAID TO TRIALETICS DURING THE TWELVE (12) MONTH PERIOD PRECEDING THE EVENT GIVING RISE TO LIABILITY.</strong>
                </p>
              </div>
            </section>

            {/* Section 23 */}
            <section id="general" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">23. General Provisions</h2>
              
              <div className="space-y-6 ml-4">
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">A. Applicable Law and Venue</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    These Terms and your use of the Service shall be governed by and construed in accordance with the laws of the State of Texas, USA, applicable to agreements made and performed entirely within Texas, without resort to conflict of law provisions. Any action arising out of or relating to these Terms shall be filed only in the state and federal courts located in Collin County, Texas. You irrevocably consent and submit to the exclusive jurisdiction of such courts.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">B. Severability</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    If any provision of this Agreement is deemed unlawful, void or unenforceable, that provision shall be severable and shall not affect the validity and enforceability of any remaining provisions.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">C. Contact Information</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Please direct any comments or questions to{' '}
                    <a href="mailto:contact@trialetics.io" className="text-primary hover:underline">
                      contact@trialetics.io
                    </a>
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">D. Assignment</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    You may not assign any of your rights or obligations hereunder without Trialetics's prior written consent.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">E. Relationship of the Parties</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    The Parties are independent contractors. These Terms do not create a partnership, franchise, joint venture, agency, fiduciary or employment relationship.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">F. Third Party Beneficiaries</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    There are no third-party beneficiaries under these Terms.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">G. Waiver</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    No failure or delay by either party in exercising any right under this Agreement will constitute a waiver of that right.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">H. Surviving Provisions</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    The sections titled "Indemnification", "Disclaimer", "Limitation of Liability", and "General Provisions" will survive any termination of these Terms.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">I. Entire Agreement</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    These Terms supersede all prior agreements or arrangements with you regarding use of the Service unless explicitly stated otherwise.
                  </p>
                </div>
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="border-t pt-8 mt-12">
            <p className="text-muted-foreground text-sm text-center">
              Last updated: February 8, 2025
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
