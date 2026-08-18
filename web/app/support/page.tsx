import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal-page';
import { contactEmail } from '@/lib/legal/constants';

export const metadata: Metadata = { title: 'Support' };

export default function Support() {
  return (
    <LegalPage title="Support">
      <LegalSection heading="Contact">
        <p>Have a question, found a bug, or need help with your account? Email us and we&apos;ll get back to you.</p>
        <ul>
          <li>Email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
        </ul>
      </LegalSection>
      <LegalSection heading="Account and data">
        <ul>
          <li>Change your body weight, experience level, or theme from your Profile</li>
          <li>Manage or cancel your subscription from the billing link on your Profile</li>
          <li>Export a copy of your workout data from your Profile</li>
          <li>Permanently delete your account and all data from the Danger Zone on your Profile</li>
        </ul>
      </LegalSection>
      <LegalSection heading="Policies">
        <ul>
          <li><a href="/privacy">Privacy Policy</a></li>
          <li><a href="/terms">Terms of Service</a></li>
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
