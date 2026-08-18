import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal-page';
import { contactEmail, legalEntityName } from '@/lib/legal/constants';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy">
      <LegalSection heading="Overview">
        <p>This Privacy Policy governs the manner in which {legalEntityName} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, maintains, and discloses information collected from users (&quot;you&quot; or &quot;User&quot;) of the GRIT — Hypertrophy Training app (&quot;App&quot; or &quot;Service&quot;). Please read this policy carefully to understand how we handle your Personally Identifiable Information (&quot;PII&quot;).</p>
      </LegalSection>

      <LegalSection heading="Information We Collect">
        <p>When you register and use the App, we may collect:</p>
        <ul>
          <li>Email address and authentication credentials when you create an account</li>
          <li>Body weight and fitness experience level you provide in your profile</li>
          <li>Workout data including exercises, sets, reps, weights, and completion status</li>
          <li>Training program configurations and muscle priority settings</li>
          <li>Personal records and strength progress data</li>
          <li>In-workout feedback including perceived effort, pump, and soreness ratings</li>
          <li>Subscription and purchase status (payment processed by Stripe, Google Play, or Apple App Store)</li>
        </ul>
        <p>We also collect certain technical information automatically:</p>
        <ul>
          <li>Device type, operating system, browser, and app version</li>
          <li>IP address and general network information</li>
        </ul>
      </LegalSection>

      <LegalSection heading="When We Collect Information">
        <p>We collect information when you:</p>
        <ul>
          <li>Register for an account or sign in</li>
          <li>Log workouts, sets, and exercise data</li>
          <li>Create or modify training programs</li>
          <li>Submit post-workout feedback</li>
          <li>Make a subscription purchase</li>
          <li>Update your profile or settings</li>
        </ul>
      </LegalSection>

      <LegalSection heading="How We Use Your Information">
        <p>We use collected information to:</p>
        <ul>
          <li>Provide and personalize the App&apos;s training features and program recommendations</li>
          <li>Calculate and display your personal records and strength progress</li>
          <li>Generate intelligent training program suggestions based on your goals and feedback</li>
          <li>Process and verify your subscription status</li>
          <li>Improve the App and fix bugs based on usage patterns</li>
          <li>Respond to your support requests</li>
          <li>Comply with applicable laws and regulations</li>
        </ul>
      </LegalSection>

      <LegalSection heading="How We Share Your Information">
        <p>We do not sell, trade, or rent your personal information to third parties. We may share information with the following trusted service providers that help us operate the App:</p>
        <ul>
          <li><strong>Supabase</strong> — our database and authentication provider, which stores your account and training data securely</li>
          <li><strong>Stripe</strong> — our web subscription and billing provider (payment details are handled entirely by Stripe)</li>
          <li><strong>RevenueCat</strong> — our mobile subscription management provider, which tracks entitlements purchased through Apple or Google</li>
          <li><strong>Apple App Store / Google Play Store</strong> — process mobile payments and billing; we never receive your full payment details</li>
        </ul>
        <p>We may also disclose information as required by law, court order, or to protect the rights and safety of users or the public.</p>
      </LegalSection>

      <LegalSection heading="How We Protect Your Information">
        <p>We use industry-standard security practices including encrypted connections (HTTPS/TLS) for all data transmitted between the App and our servers, and access controls on our database. However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.</p>
      </LegalSection>

      <LegalSection heading="Data Corrections and Deletion">
        <p>You have the right to access, correct, or request deletion of your personal data:</p>
        <ul>
          <li>You can update profile information (body weight, experience level) directly in the App</li>
          <li>You can permanently delete your account and all associated data from the Danger Zone in your Profile settings</li>
          <li>To request assistance with data deletion or corrections, email us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
          <li>To withdraw consent for data processing, contact us — note that this will require deletion of your account as data processing is necessary to provide the Service</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Children's Privacy (COPPA)">
        <p>The App is intended for individuals 18 years of age and older. We do not knowingly collect personal information from children under 13 years of age. If we become aware that we have collected personal information from a child under 13, we will promptly remove it. If you believe we have collected information from your child, please contact us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
      </LegalSection>

      <LegalSection heading="California Privacy Rights (CalOPPA)">
        <p>In compliance with the California Online Privacy Protection Act, we agree that users may use the App without providing personal information beyond what is required to create an account. We will post any changes to this Privacy Policy on this page. Users may request changes to their personal information by contacting us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
      </LegalSection>

      <LegalSection heading="Third-Party Services">
        <p>The App integrates with Supabase, Stripe, and RevenueCat, each governed by their own privacy policies. We are not responsible for the privacy practices of these providers. The App does not display third-party advertising or track users across external websites.</p>
      </LegalSection>

      <LegalSection heading="Do Not Track">
        <p>The App does not track users across third-party websites or services. We honor Do Not Track signals where applicable.</p>
      </LegalSection>

      <LegalSection heading="International Users">
        <p>If you access the App from outside the United States, your information will be transferred to, stored, and processed in the United States. By using the App, you consent to this transfer and to the use of your data as described in this policy.</p>
      </LegalSection>

      <LegalSection heading="Changes to This Policy">
        <p>We may update this Privacy Policy at any time. Changes will be posted on this page with an updated &quot;Last updated&quot; date. Continued use of the App after changes are posted constitutes acceptance of the revised policy.</p>
      </LegalSection>

      <LegalSection heading="Contact Us">
        <p>If you have any questions about this Privacy Policy, please contact us:</p>
        <ul>
          <li>Email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
          <li>App: GRIT — Hypertrophy Training</li>
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
