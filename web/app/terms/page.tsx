import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal-page';
import { contactEmail, legalEntityName } from '@/lib/legal/constants';

export const metadata: Metadata = { title: 'Terms of Service' };
export const revalidate = 86400;

export default function TermsOfService() {
  return (
    <LegalPage title="Terms of Service">
      <LegalSection heading="Agreement">
        <p>This Agreement (&quot;Terms&quot;) governs your use of the GRIT — Hypertrophy Training application (&quot;App&quot;), owned and operated by {legalEntityName} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account, installing, or using the App on web or mobile, you agree to these Terms. If you do not agree, do not use the App.</p>
      </LegalSection>

      <LegalSection heading="License">
        <p>We grant you a personal, non-exclusive, non-transferable, revocable license to use the App for your own personal fitness tracking and training purposes. You may not copy, modify, distribute, sell, or sublicense any part of the App. All content and intellectual property within the App is owned by or licensed to us. We may revoke this license at any time for violations of these Terms.</p>
      </LegalSection>

      <LegalSection heading="Not Medical Advice">
        <p className="notice error" role="alert">THE APP IS NOT INTENDED TO PROVIDE MEDICAL ADVICE. Always consult a qualified healthcare provider before beginning any new exercise program.</p>
        <p>The training programs, volume recommendations, and exercise suggestions are for general fitness purposes only and do not constitute professional medical advice, diagnosis, or treatment.</p>
        <ul>
          <li>Always consult your physician or qualified healthcare provider before beginning any new exercise program, especially if you have pre-existing medical conditions or injuries</li>
          <li>Stop exercising immediately and seek medical attention if you experience chest pain, dizziness, shortness of breath, or other unusual symptoms</li>
          <li>In an emergency, call 911 or your local emergency services</li>
          <li>You assume all risk associated with your use of the App and participation in any training activities</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Age Requirement">
        <p>The App is intended for individuals 18 years of age and older. By using the App, you confirm that you are at least 18 years old. We do not knowingly permit individuals under 18 to create accounts or use the Service.</p>
      </LegalSection>

      <LegalSection heading="Account">
        <p>You must create an account to use the App. You agree to:</p>
        <ul>
          <li>Provide accurate and truthful information when registering</li>
          <li>Keep your login credentials confidential and not share them with others</li>
          <li>Notify us promptly at <a href={`mailto:${contactEmail}`}>{contactEmail}</a> if you believe your account has been compromised</li>
          <li>Take responsibility for all activity that occurs under your account</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Subscriptions and Billing">
        <p>The App offers a subscription (&quot;GRIT Pro&quot;) that unlocks full access to all features. On the web, subscriptions are billed through Stripe; on mobile, through the Google Play Store or Apple App Store. By subscribing, you agree to the applicable billing provider&apos;s terms.</p>
        <ul>
          <li>A free trial may be available for new subscribers; you will be charged at the end of the trial period unless you cancel before it ends</li>
          <li>Subscriptions automatically renew unless cancelled before the end of the current period</li>
          <li>To cancel a web subscription, use the billing portal link in your Profile; to cancel a mobile subscription, use the Google Play Store or Apple App Store settings</li>
          <li>Refunds are governed by the applicable billing provider&apos;s refund policy</li>
          <li>We reserve the right to change subscription pricing with advance notice</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Acceptable Use">
        <p>You may use the App only for lawful personal fitness purposes. You agree not to:</p>
        <ul>
          <li>Use the App to violate any applicable law or regulation</li>
          <li>Attempt to reverse-engineer, decompile, or extract the App&apos;s source code</li>
          <li>Use the App to harm, defraud, or harass any person</li>
          <li>Interfere with or disrupt the App&apos;s servers, networks, or infrastructure</li>
          <li>Transmit viruses, malware, or any other harmful code</li>
          <li>Attempt to gain unauthorized access to any part of the App or its backend systems</li>
          <li>Share your account with others or allow others to use your credentials</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Your Content">
        <p>You may enter workout notes, program names, and other content into the App. You retain ownership of your content but grant us a limited license to store and process it solely to provide the Service. You are responsible for the content you enter. We reserve the right to remove any content that violates these Terms.</p>
      </LegalSection>

      <LegalSection heading="Disclaimer of Warranties">
        <p>THE APP IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS. YOUR USE OF THE APP IS AT YOUR SOLE RISK.</p>
      </LegalSection>

      <LegalSection heading="Limitation of Liability">
        <p>TO THE FULLEST EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE APP, INCLUDING PERSONAL INJURY, PROPERTY DAMAGE, LOST PROFITS, OR DATA LOSS. TO THE EXTENT LIABILITY CANNOT BE EXCLUDED, OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR $1.00 USD.</p>
      </LegalSection>

      <LegalSection heading="Privacy">
        <p>Your use of the App is governed by our <a href="/privacy">Privacy Policy</a>, incorporated into these Terms by reference. By using the App, you consent to the collection and use of your information as described therein.</p>
      </LegalSection>

      <LegalSection heading="DMCA Copyright Notice">
        <p>If you believe any content in the App infringes your copyright, please send a written notice to <a href={`mailto:${contactEmail}`}>{contactEmail}</a> including: (1) identification of the copyrighted work; (2) identification of the allegedly infringing material; (3) your contact information; (4) a good faith belief statement; and (5) a statement under penalty of perjury that you are the copyright owner or authorized to act on their behalf.</p>
      </LegalSection>

      <LegalSection heading="Governing Law">
        <p>These Terms are governed by the laws of the State of Michigan, United States of America, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the App shall be resolved through binding arbitration in Michigan, and you waive any right to a jury trial or class action lawsuit to the fullest extent permitted by law.</p>
      </LegalSection>

      <LegalSection heading="Changes to These Terms">
        <p>We reserve the right to modify these Terms at any time. Updated Terms will be posted on this page with a revised &quot;Last updated&quot; date. Your continued use of the App after changes are posted constitutes acceptance of the new Terms.</p>
      </LegalSection>

      <LegalSection heading="Termination">
        <p>We may suspend or terminate your access to the App at any time for violation of these Terms, without prior notice or liability. Upon termination, your right to use the App ceases immediately.</p>
      </LegalSection>

      <LegalSection heading="Contact Us">
        <p>If you have any questions about these Terms, please contact us:</p>
        <ul>
          <li>Email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
          <li>App: GRIT — Hypertrophy Training</li>
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
