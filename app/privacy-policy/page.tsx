import { Metadata } from 'next';
import Link from 'next/link';

import Noise from '@/components/noise';

export const metadata: Metadata = {
  title: 'Privacy Policy | Trialetics',
  description: 'Privacy Policy for Trialetics Clinical Trial Management System (CTMS) subscribers. Learn how we collect, use, and protect your data. Version: January 8, 2025.',
};

export default function PrivacyPolicy() {
  return (
    <section className="section-padding relative">
      <Noise />
      <div className="container max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-4xl font-medium tracking-tighter md:text-5xl lg:text-6xl">
              Privacy Policy
            </h1>
            <div className="text-muted-foreground space-y-1 text-sm">
              <p><strong>For Trialetics CTMS Subscribers</strong></p>
              <p><strong>Policy Version:</strong> January 8, 2025</p>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-muted/50 border-l-4 border-primary p-6 rounded-r-lg space-y-3">
            <p className="text-sm leading-relaxed">
              <strong>IMPORTANT:</strong> This Privacy Policy covers subscribers to Trialetics CTMS, users of our custom software development services, Excel to SaaS conversion services, and ready-to-use App Store modules. It details how we collect and process personal data with our contracted third-party partners.
            </p>
            <p className="text-sm leading-relaxed">
              <strong>Note:</strong> This policy does NOT cover personal information processed by website visitors. Visitors to the Trialetics website are covered under a separate Privacy Policy available at{' '}
              <a href="https://www.trialetics.io" className="text-primary hover:underline">
                https://www.trialetics.io
              </a>
            </p>
            <p className="text-sm leading-relaxed">
              In addition to this document, a Master Subscription Agreement applies to all subscribers and our{' '}
              <Link href="/terms-and-conditions" className="text-primary hover:underline">
                Terms of Use
              </Link>{' '}
              applies to all users.
            </p>
          </div>

          {/* Main Content */}
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-12">
            
            {/* Section 1 */}
            <section id="introduction" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Trialetics Technologies (the "Company") is committed to protecting the privacy of customers and authorized users who subscribe to use the Services as defined below ("Customers"). This Privacy Policy describes the Company's privacy practices in relation to the use of the services offered by the Company (the "Services").
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The Services include our online, on-demand, software-as-a-service Clinical Trial Management System (CTMS) and Electronic Trial Master File (eTMF) product ("Trialetics Modules"), custom software development services, Excel to SaaS conversion services, and ready-to-use modules available through our App Store.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Please note that for the purpose of EU data protection legislation, Customers and their authorized users are the data controllers of the information that is entered into the CTMS application for the established business purpose. Authorized users are individuals who are invited by the customer to create CTMS accounts to utilize the Trialetics services. Trialetics is the data processor except where we utilize third party partners to support the Services provided to you as described further in this document.
              </p>
            </section>

            {/* Section 1.5 - Regulatory Compliance */}
            <section id="regulatory-compliance" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">1.5 Regulatory Compliance</h2>
              
              <div className="bg-blue-500/10 border-l-4 border-blue-500 p-6 rounded-r-lg space-y-3">
                <p className="text-sm leading-relaxed">
                  <strong>21 CFR Part 11 &amp; EU GMP Annex 11 Compliance:</strong> Trialetics Technologies maintains compliance with 21 CFR Part 11 requirements for electronic records and electronic signatures in clinical trial management and aligns with EU GMP Annex 11 expectations for computerized systems used in regulated environments. Our platform implements appropriate controls for data integrity, audit trails, system validation, and electronic signature authentication to support regulated-use requirements.
                </p>
                <p className="text-sm leading-relaxed">
                  Key compliance features include:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>Comprehensive audit trails tracking all data changes with user identification and timestamps</li>
                  <li>Secure electronic signature capabilities with unique user authentication</li>
                  <li>Data integrity controls preventing unauthorized alteration of records</li>
                  <li>System validation documentation and regular security assessments</li>
                  <li>User access controls and role-based permissions</li>
                </ul>
              </div>

              <div className="bg-purple-500/10 border-l-4 border-purple-500 p-6 rounded-r-lg space-y-3 mt-4">
                <p className="text-sm leading-relaxed">
                  <strong>HIPAA Compliance for Custom Builds:</strong> While our standard CTMS platform does not process Protected Health Information (PHI) and is not HIPAA-compliant by default, we offer HIPAA-compliant custom software development services upon client request.
                </p>
                <p className="text-sm leading-relaxed">
                  For custom builds requiring HIPAA compliance, we implement:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>Execution of Business Associate Agreements (BAAs) with clients</li>
                  <li>Enhanced data encryption for PHI at rest and in transit</li>
                  <li>Additional access controls and authentication mechanisms</li>
                  <li>Comprehensive audit logging for all PHI access and modifications</li>
                  <li>Regular security risk assessments and vulnerability testing</li>
                  <li>Incident response procedures for potential PHI breaches</li>
                  <li>Staff training on HIPAA Privacy and Security Rules</li>
                </ul>
                <p className="text-sm leading-relaxed mt-3">
                  <strong>Important:</strong> Clients requiring HIPAA compliance must explicitly request this during the initial project scoping phase. HIPAA-compliant custom builds are subject to additional security requirements, validation procedures, and contractual obligations beyond our standard service offerings.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section id="information-collected" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">2. Types of Information Collected and How We Collect It</h2>
              <p className="text-muted-foreground leading-relaxed">
                This policy applies to all information collected or submitted via Trialetics licensed CTMS Services. We collect information in several ways, which are described below.
              </p>
              
              <div className="space-y-6 ml-4">
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">A. Information We Collect from You Automatically</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    As you utilize the Company's Services, we gather certain information automatically from your device and store it in log files. This information may include personal information such as your internet protocol (IP) address and non-personal data such as browser type, operating system, website navigational information, and date/time stamp.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    We collect information through the use of commonly used information-gathering tools, such as cookies and web beacons. Website Navigational Information includes standard information from your web browser and the actions you take within Trialetics. We make no attempt to link this information with your identity without express permission.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    We may review server logs for system administration and security purposes, for example, to detect intrusions and to monitor usage statistics. In instances of criminal malfeasance, server log data containing IP addresses could be used to trace users, and we may share raw data logs with appropriate authorities for investigating security breaches.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">B. Information You Provide</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    As you utilize the Company's Services, the information collected depends on the content you enter for the established business purpose. For example:
                  </p>
                  
                  <div className="space-y-4 ml-4">
                    <div>
                      <p className="text-muted-foreground leading-relaxed">
                        <strong>Subscription Information</strong> - If you are performing the initial Trialetics subscription on behalf of the Customer, subscription details include information about the Customer, the subscription plan, and your personal data. This includes billing name and address, credit card number and/or banking information, and contact details ("Billing Information"). We may also request optional information such as number of employees or specialty ("Optional Information"). Required Contact Information, Billing Information, and Optional Information are referred to collectively as "Subscription Data".
                      </p>
                      <p className="text-muted-foreground leading-relaxed mt-2">
                        The Company does not store, retain, or use your Billing Information except for payment processing activities associated with Customer subscriptions.
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground leading-relaxed">
                        <strong>Customer Data</strong> - To use the Services, licensed customers and authorized users will be inputting, importing, utilizing data integration and/or uploading files to the CTMS (referred to collectively as "Customer Data") for the established business purpose. Customer Data entered may include organization and person contact records, documents and files, calendar records, study definitions, study planning data, subject data (for high-level tracking, not personal health information), and study tracking data related to clinical trial management.
                      </p>
                      <p className="text-muted-foreground leading-relaxed mt-2">
                        Personal data including name, address, email, and phone numbers may be entered into the Services. Care should be taken by Customers and their authorized users as the established data controllers with respect to the input of personal data. <strong>Personal health data should not be entered into the Service.</strong> All customer data is owned by the subscribing customer.
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground leading-relaxed">
                        <strong>Support Data</strong> - When utilizing the Service, authorized users may contact the Company for support or guidance. When you submit support tickets, these will be collected in our ticketing system. Personal data submitted might include your name, email address, and phone, along with other non-personal data describing the problem encountered.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">C. Information We Create</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    You may generate Support Data as you use the Service. The Company may communicate with you to support your business needs. We may also create internal tasks to manage your support issues, develop product features, or manage activities for multiple users within a customer. This information may be created and processed in third-party services and may include your personal information such as name, phone number, and email.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    The Company may also send you emails related to your use of the Service, such as email alerts related to actions you are performing in the CTMS. We may process this information using a third-party email provider.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section id="how-we-use" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">3. The Way We Use the Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed">
                We securely store the customer data and support data you input into our CTMS application and support ticketing system in accordance with the established business purpose. Some of the ways we use your information for legitimate purposes include:
              </p>
              
              <ul className="list-disc list-inside space-y-2 ml-4 text-muted-foreground">
                <li>
                  <strong>Customer Data</strong> - Customers electronically enter and submit data to the Services for hosting and processing purposes related to clinical trial management. The Company will not review, share, distribute, or reference any such Customer Data except as provided in the Master Subscription Agreement or as may be required by law. We may access Customer Data only for providing the Services and support, or as required by law. We may use Customer Data in system-wide aggregated analytics to make internal business decisions (such as feature enhancements) and public statements about the service. No single customer, study, organization, contact, or user will be identifiable in these aggregated metrics.
                </li>
                <li>
                  <strong>Support Data</strong> - The Company will use your support data to provide assistance on your use of the Service. We may also use support data to trend issues, improve training materials, and identify product improvements.
                </li>
                <li>
                  <strong>Subscription (Financial Data)</strong> - The Company will use your financial information only to facilitate payment for use of the Service. We use Subscription Data solely to check financial qualifications and collect payment from Customers. We use a qualified third-party service provider to manage payments. This service provider is not permitted to store, retain, or use Billing Information except for payment processing on our behalf.
                </li>
                <li>
                  <strong>Tracking Technologies</strong> - The Company may use tracking technologies (e.g., detection of delivered and viewed email alerts) in combination with Support Data to assist you when providing support.
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section id="data-sharing" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">4. Who We May Share Your Data With</h2>
              <p className="text-muted-foreground leading-relaxed">
                Personal information that you submit through the Service may be transferred to countries other than where you live, such as to our servers and third-party affiliates that support the Services (including our CTMS/eTMF modules, custom software development services, Excel to SaaS conversion services, and App Store modules). Where required by law, we obtain your consent to use and process your personal data for these purposes (e.g., via your agreement with the Terms of Use when activating your account).
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Unless you give us your permission, we don't share data we collect from you with third parties, except as described below:
              </p>
              
              <div className="space-y-6 ml-4">
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">A. Third Party Service Providers or Consultants</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We may share data collected from you via the Service with third party providers or consultants who need access to the data to support you or enable the Company to improve the service. These third party service providers are limited to only accessing or using this data to provide services to us and must provide contractual assurances that they will appropriately safeguard the data.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    The following third-party providers support Trialetics through information collected from the Service:
                  </p>
                  
                  <ul className="list-disc list-inside space-y-3 ml-4 text-muted-foreground text-sm">
                    <li>
                      <strong>OpenAI</strong> - We utilize OpenAI's artificial intelligence services to power certain features within our platform, including AI-assisted functionality. OpenAI maintains SOC 2 Type II compliance and provides robust data protection measures.{' '}
                      <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        https://openai.com/privacy
                      </a>
                    </li>
                    <li>
                      <strong>Anthropic (Claude)</strong> - We use Anthropic's Claude AI services to provide intelligent features and assistance within the platform. Anthropic maintains strong security practices and data protection standards.{' '}
                      <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        https://www.anthropic.com/legal/privacy
                      </a>
                    </li>
                    <li>
                      <strong>Supabase</strong> - We use Supabase as our backend database and authentication provider. They store customer data for the established business purpose. Supabase maintains SOC 2 Type II compliance and is GDPR compliant with robust data protection measures.{' '}
                      <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        https://supabase.com/privacy
                      </a>
                    </li>
                    <li>
                      <strong>Stripe</strong> - We utilize Stripe to facilitate secure credit card processing for customer subscriptions. Stripe Inc. complies with PCI Security Standards Council and has executed a Data Protection Agreement with Trialetics.{' '}
                      <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        https://stripe.com/privacy
                      </a>
                    </li>
                    <li>
                      <strong>Loops.so</strong> - We use Loops for email communications and transactional emails to users related to their specific use of the Service. Loops maintains strong security practices and provides data protection measures.{' '}
                      <a href="https://loops.so/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        https://loops.so/privacy
                      </a>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">B. Compliance with Laws</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We may disclose your data to a third party if: (i) we believe that disclosure is reasonably necessary to comply with any applicable law, regulation, legal process or government request; (ii) to enforce our agreements and policies; (iii) to protect the security and integrity of our Service; (iv) to protect ourselves, our other customers, or the public from harm or illegal activities.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    If Trialetics is required by law to disclose any of your data that directly identifies you, then we will use reasonable efforts to provide you with notice of that disclosure requirement unless prohibited by statute, subpoena, or court order. We object to requests that we do not believe were issued properly.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">C. Business Transfers</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Information may be disclosed and otherwise transferred to any potential acquirer, successor, or assignee as part of any proposed merger, acquisition, debt financing, sale of assets, or similar transaction, or in the event of insolvency, bankruptcy, or receivership in which information is transferred to one or more third parties as one of our business assets.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section id="legal-basis" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">5. Legal Basis for Processing Personal Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our legal basis for collecting and using the personal information described will depend on the personal information concerned and the specific context in which we collect it. However, we will normally collect personal information from you where we have your consent to do so, where we need the personal information to contact you, or where processing is in our legitimate interests and is not overridden by your data protection interests or fundamental rights and freedoms.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                In some cases, we may also have a legal obligation to collect the personal information in question. If we ask you to provide personal information to comply with a legal requirement, we will make this clear at the relevant time and advise you whether the provision of your personal information is mandatory or not.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Similarly, if we collect and use your personal information in reliance on our or a third party's legitimate interests and those interests are not already listed above, we will make clear to you at the relevant time what those legitimate interests are.
              </p>
              
              <div className="bg-muted/30 p-4 rounded-lg mt-4">
                <p className="text-sm font-semibold mb-2">Exceptions</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Except as described above, we will not otherwise use or disclose any of your personally identifiable information, except to the extent reasonably necessary: (i) to correct technical problems and malfunctions; (ii) to protect the security and integrity of our Service; (iii) to protect our rights and property and the rights and property of others; (iv) to take precautions against liability; (v) to the extent required by law or to respond to judicial process; or (vi) to the extent permitted under other provisions of law, to provide information to law enforcement agencies or for an investigation on a matter related to public safety.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section id="data-security" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">6. Our Commitment To Data Security and Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                Trialetics is committed to protecting your information. To prevent unauthorized access, maintain data accuracy, and ensure the correct use of information, we have put in place appropriate physical, electronic, and managerial procedures to safeguard and secure the information we collect in our Service.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The information you provide us may be archived or stored periodically by us according to backup processes conducted in the ordinary course of business. Information stored as part of this backup process will be deleted in due course on a regular schedule.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                In general, we retain personal information we collect from you where we have an ongoing legitimate business need to do so (e.g., your organization is an active subscriber to the Services). When we have no ongoing legitimate business need to process your personal information, we will either delete it, or if this is not possible, then we will securely store your personal information and isolate it from any further processing until deletion is complete.
              </p>
              
              <div className="bg-muted/30 p-4 rounded-lg mt-4">
                <p className="text-sm font-semibold mb-2">Personal Data Storage Locations</p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li><strong>Production/live system database:</strong> The Data Controller (the Client) is responsible for maintaining accurate data. This data is persisted until the Client terminates use of the Service.</li>
                  <li><strong>System audit log:</strong> For regulatory purposes, the system maintains an audit log of all system changes. The audit log cannot be altered and is deleted along with other customer data after the Client terminates use of the Service.</li>
                  <li><strong>Server log files:</strong> Maintained for a brief amount of time on a rolling basis for support purposes and are deleted on a regular schedule.</li>
                  <li><strong>System backups:</strong> Database and system backups are maintained for a brief amount of time on a rolling basis for support and system recovery purposes.</li>
                  <li><strong>Third party providers:</strong> Your personal data may be stored according to their policies and procedures in accordance with the established business need and our established agreements.</li>
                </ul>
              </div>
            </section>

            {/* Section 7 */}
            <section id="sensitive-data" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">7. Sensitive Data</h2>
              <div className="bg-amber-500/10 border-l-4 border-amber-500 p-6 rounded-r-lg">
                <p className="text-sm leading-relaxed">
                  <strong>Trialetics does not knowingly solicit or collect, and you should not provide to us, any information regarding an individual's medical or mental health condition, race or ethnic origin, political opinions, religious or philosophical beliefs, or other sensitive data.</strong>
                </p>
                <p className="text-sm leading-relaxed mt-3">
                  <strong>Exceptions:</strong> 'Gender' and 'date of birth' fields may be available in certain anonymized subject tracking features within the Services. This is intended to facilitate reconciliation of anonymized subject records across systems/trackers, as no subject name or other uniquely identifying personal information is captured (only an anonymous subject number). Although this data is optional, care should be taken if you decide to enter this information in accordance with the established business purpose.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section id="tracking-technologies" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">8. Tracking Technologies</h2>
              
              <div className="space-y-6 ml-4">
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">A. Website Navigational and Performance Information</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    The Company uses Website Navigational Information to operate and improve the Service. For example, server performance metrics are utilized to monitor application loading time. Error monitoring tools capture details about your navigational experience so we may provide support. We may also use Website Navigational Information alone or in combination with Subscription Data and Customer Data to provide support and enhance the services.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">B. Cookies</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    A cookie is a piece of data stored on the hard drive of your computer. The Company uses cookies that are session-based and persistent-based. Session cookies are removed when you close your browser or application tab. Persistent cookies remain on your computer after you close your browser.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Session cookies provide an industry standard method to allow a single login to authorize a user until the user logs out or the session expires. Persistent cookies and browser storage features may be used to store user preferences for a longer period of time.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    <strong>Note:</strong> If you disable your web browser's ability to accept cookies, you will not be able to successfully use the Services. Data from cookies is not used for advertising, nor is it shared with third parties except when necessary to provide the intended business use and support licensed customers.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">C. Web Beacons</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    The Company uses web beacons alone or in conjunction with cookies to track and support Customers' usage of the Services and interaction with emails. Web beacons are clear electronic images that can track simple user activity, such as viewing of a transactional email or clicking on a link within an email. We use this information to track user activity and improve our communications.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">D. IP Addresses</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    When you use the Services, the Company collects your Internet Protocol ("IP") addresses to track and aggregate non-personal information as well as to provide customer support. For example, we use IP addresses to monitor the regions from which Customers utilize the Services.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 9 */}
            <section id="public-forums" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">9. Public Forums</h2>
              <p className="text-muted-foreground leading-relaxed">
                Within the Services, the Company may direct users to public forums for support purposes, where users can post questions or issues and receive assistance from Company support personnel or other users. Such forums may be used in addition to direct customer support.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Public Forums will be clearly labeled and will exist outside of the user-login area of the Service. <strong>Users should take care to understand these are public forums and not reveal any personal, confidential, or sensitive information in any posts made to a public forum.</strong>
              </p>
            </section>

            {/* Section 10 */}
            <section id="opt-outs" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">10. Your Choices and Opt-Outs</h2>
              <p className="text-muted-foreground leading-relaxed">
                Trialetics takes reasonable steps to ensure that the data we collect is reliable for its intended use, accurate, complete, and up to date.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We respond to all requests we receive from individuals wishing to exercise their data protection rights in accordance with applicable data protection laws. You may update or remove the information you provided to us by contacting us at{' '}
                <a href="mailto:contact@trialetics.io" className="text-primary hover:underline">
                  contact@trialetics.io
                </a>. To protect your privacy and security, we will take reasonable steps to verify your identity before updating or removing your information. Given that the Customer is the data controller for the Service, the Company will work with them to facilitate your requests.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Note:</strong> The Services require the authorized use of personal data by users in order to fulfill the intended business Services. An email address, first name, and last name are required to be a user of the Trialetics Services. Opting out of sharing this information with Trialetics would preclude that person from having a user account to access the Services.
              </p>
            </section>

            {/* Section 11 */}
            <section id="gdpr-ccpa-rights" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">11. Your Data Protection Rights Under GDPR and CCPA</h2>
              <p className="text-muted-foreground leading-relaxed">
                Subscribers from all locations have the following data protection rights:
              </p>
              
              <ul className="list-disc list-inside space-y-3 ml-4 text-muted-foreground">
                <li>
                  <strong>Access, Correct, Update, or Delete:</strong> If you wish to access, correct, update, or request deletion of your personal information, you can do so at any time by emailing{' '}
                  <a href="mailto:contact@trialetics.io" className="text-primary hover:underline">
                    contact@trialetics.io
                  </a>. Users can update their personal and contact information within the Service (e.g., User Account or Profile form). Note that email address is required for users, and can be edited, but not removed.
                </li>
                <li>
                  <strong>Object to Processing:</strong> You can object to the processing of your personal information, ask us to restrict the processing, or request portability of your personal information. You can exercise these rights by emailing{' '}
                  <a href="mailto:contact@trialetics.io" className="text-primary hover:underline">
                    contact@trialetics.io
                  </a>. Access to the data described in this policy is critical and necessary for Trialetics to provide and support the Service. Therefore, the only effective way for a user to opt-out of Company use of data is to deprovision (deactivate) your account.
                </li>
                <li>
                  <strong>Opt-Out of Marketing:</strong> Although the Company does not typically send marketing emails to users, we may do so on occasion (e.g., to notify users of new services, industry events). You have the right to opt-out of marketing communications at any time by clicking the "unsubscribe" or "opt-out" link in marketing emails, or by contacting us at{' '}
                  <a href="mailto:contact@trialetics.io" className="text-primary hover:underline">
                    contact@trialetics.io
                  </a>.
                </li>
                <li>
                  <strong>Transactional Emails:</strong> Users of the Services will receive transactional email related to their account and the intended business purpose (e.g., management of clinical trials). Transactional emails are required for use of the system (e.g., to facilitate password resets). Opting out of transactional emails would preclude that person from having a user account to access the Services.
                </li>
                <li>
                  <strong>Withdraw Consent:</strong> If we have collected and processed your personal information with your consent, you can withdraw your consent at any time. Withdrawing your consent will not affect the lawfulness of any processing we conducted prior to your withdrawal. Access to the data described in this policy is critical and necessary for Trialetics to provide and support the Service. Therefore, the only effective way to opt-out is to terminate the customer subscription or deprovision a specific user.
                </li>
                <li>
                  <strong>Complain to Data Protection Authority:</strong> You have the right to complain to a data protection authority about our collection and use of your personal information. For more information, please contact your local data protection authority. A list of European Data Protection Board Members can be found at{' '}
                  <a href="https://edpb.europa.eu/about-edpb/board/members_en" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    https://edpb.europa.eu/about-edpb/board/members_en
                  </a>.
                </li>
              </ul>
            </section>

            {/* Section 12 */}
            <section id="childrens-privacy" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">12. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Children under 18 are prohibited from using our Services. If you learn that a child has created a user account or provided us with personal information in violation of this Privacy Policy, you can alert us at{' '}
                <a href="mailto:contact@trialetics.io" className="text-primary hover:underline">
                  contact@trialetics.io
                </a>.
              </p>
            </section>

            {/* Section 13 */}
            <section id="policy-changes" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">13. Notification of Changes to this Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                As we expand our Service and as privacy laws and regulations evolve, it may be necessary to revise or update our Privacy Policy from time to time. If we make changes to this Privacy Policy, we will notify you by posting an announcement on our Service.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                If we materially change the ways in which we use or share personal information previously collected from you through our Service, we will notify you by email or other communication.
              </p>
            </section>

            {/* Section 14 */}
            <section id="international-transfers" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">14. International Data Transfers</h2>
              <p className="text-muted-foreground leading-relaxed">
                Trialetics is a US-based company. Our policy is to ensure effective procedural and organizational controls are in place to maintain all customer and personal data with adequate protections.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                As these protections relate to European Commission requirements for cross-border and international data transfer mechanisms, the Company relies on Standard Data Protection Clauses and other means to ensure compliance with processing of personal information by recipients outside the European Economic Area. Other means includes the transfer of personal data to recipients that are in a country recognized by the European Commission as offering an adequate level of protection, compliance with approved Binding Corporate Rules, or pursuant to an approved certification mechanism or code of conduct.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Additionally, the Company uses robust security measures to protect Customer Data and user's personal information. This includes physical security of data centers, network security, operating system security, and application security. All third party partners (vendors) who support the Service are assessed to ensure they provide adequate levels of protection with appropriate contractual obligations. All data transferred over the public Internet is encrypted.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Authorized users have the ability to export and download customer data, which may include personal data, from the Services anywhere they have internet access. As the Data Controllers, the Client should have adequate policies and procedures in place regarding data transfers performed by their Authorized Users.
              </p>
            </section>

            {/* Section 15 */}
            <section id="safeguarding" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">15. Compliance and Safeguarding Your Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                If utilizing offline browser functionality provided by the Service, then Customer Data may be stored within the browser. As with exported or downloaded data, the user is responsible for maintaining security around their personal computer or device.
              </p>
            </section>

            {/* Section 16 */}
            <section id="contact" className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">16. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions or concerns about this Privacy Policy, please feel free to email us at{' '}
                <a href="mailto:contact@trialetics.io" className="text-primary hover:underline">
                  contact@trialetics.io
                </a>.
              </p>
            </section>

          </div>

          {/* Footer */}
          <div className="border-t pt-8 mt-12">
            <p className="text-muted-foreground text-sm text-center">
              Last updated: January 8, 2025
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
