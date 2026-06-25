import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../src/utils/useColors';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ children }: { children: string }) {
  const colors = useColors();
  return <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>{children}</Text>;
}

function Bullet({ children }: { children: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
      <Text style={{ color: colors.primary, fontSize: 14, lineHeight: 22 }}>•</Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22, flex: 1 }}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicy() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', flex: 1 }}>Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 24 }}>Last updated: June 25, 2026</Text>

        <Section title="Overview">
          <Body>
            This Privacy Policy governs the manner in which Cameron Porter ("we," "us," or "our") collects, uses, maintains, and discloses information collected from users ("you" or "User") of the GRIT app ("App" or "Service"). Please read this policy carefully to understand how we handle your Personally Identifiable Information ("PII") in connection with the App.
          </Body>
        </Section>

        <Section title="Information We Collect">
          <Body>When you register and use the App, we may collect the following:</Body>
          <View style={{ marginTop: 10 }}>
            <Bullet>Email address and authentication credentials when you create an account</Bullet>
            <Bullet>Body weight and fitness experience level you provide in your profile</Bullet>
            <Bullet>Workout data including exercises, sets, reps, weights, and completion status</Bullet>
            <Bullet>Training program configurations and muscle priority settings</Bullet>
            <Bullet>Personal records and strength progress data</Bullet>
            <Bullet>In-workout feedback including perceived effort, pump, and soreness ratings</Bullet>
            <Bullet>Subscription and purchase status processed through the Google Play Store or Apple App Store</Bullet>
          </View>
          <View style={{ marginTop: 10 }}>
            <Body>We also collect certain technical information automatically:</Body>
            <View style={{ marginTop: 8 }}>
              <Bullet>Device type, operating system, and app version</Bullet>
              <Bullet>IP address and general network information</Bullet>
            </View>
          </View>
        </Section>

        <Section title="How We Collect Information">
          <Body>We collect information when you:</Body>
          <View style={{ marginTop: 10 }}>
            <Bullet>Register for an account or sign in</Bullet>
            <Bullet>Log workouts, sets, and exercise data</Bullet>
            <Bullet>Create or modify training programs</Bullet>
            <Bullet>Submit post-workout feedback</Bullet>
            <Bullet>Make in-app subscription purchases</Bullet>
            <Bullet>Update your profile or settings</Bullet>
          </View>
        </Section>

        <Section title="How We Use Your Information">
          <Body>We use collected information to:</Body>
          <View style={{ marginTop: 10 }}>
            <Bullet>Provide and personalize the App's training features and program recommendations</Bullet>
            <Bullet>Calculate and display your personal records and strength progress</Bullet>
            <Bullet>Generate intelligent training program suggestions based on your goals and feedback</Bullet>
            <Bullet>Process and verify your subscription status</Bullet>
            <Bullet>Improve the App and fix bugs based on usage patterns</Bullet>
            <Bullet>Respond to your support requests</Bullet>
            <Bullet>Comply with applicable laws and regulations</Bullet>
          </View>
        </Section>

        <Section title="How We Share Your Information">
          <Body>
            We do not sell, trade, or rent your personal information to third parties. We may share information with trusted service providers that help us operate the App:
          </Body>
          <View style={{ marginTop: 10 }}>
            <Bullet>Supabase — our database and authentication provider, which stores your account and training data securely</Bullet>
            <Bullet>RevenueCat — our subscription management provider, which tracks your entitlements (payment itself is handled by Apple or Google)</Bullet>
            <Bullet>Apple App Store / Google Play Store — process all payments and billing; we never receive your full payment details</Bullet>
          </View>
          <View style={{ marginTop: 10 }}>
            <Body>
              We may also disclose information as required by law, court order, or to protect the rights and safety of users or the public.
            </Body>
          </View>
        </Section>

        <Section title="How We Protect Your Information">
          <Body>
            We use industry-standard security practices to protect your data, including encrypted connections (HTTPS/TLS) for all data transmitted between the App and our servers, and access controls on our database. However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
          </Body>
        </Section>

        <Section title="Data Corrections and Deletion">
          <Body>You have the right to access, correct, or request deletion of your personal data.</Body>
          <View style={{ marginTop: 10 }}>
            <Bullet>You can update profile information (body weight, experience level) directly in the App</Bullet>
            <Bullet>To request full account and data deletion, email us at info@cameron-porter.com</Bullet>
            <Bullet>To withdraw consent for data processing, contact us — note that this will require deletion of your account as data processing is necessary to provide the Service</Bullet>
          </View>
        </Section>

        <Section title="Children's Privacy (COPPA)">
          <Body>
            The App is intended for use by individuals 18 years of age and older. We do not knowingly collect personal information from children under 13 years of age. If we become aware that we have collected personal information from a child under 13, we will promptly remove it. If you believe we have collected information from your child, please contact us at info@cameron-porter.com.
          </Body>
        </Section>

        <Section title="California Privacy Rights (CalOPPA)">
          <Body>
            In compliance with the California Online Privacy Protection Act, we agree that users may visit the App without providing personal information. We will post any changes to this Privacy Policy on this page. Users may request changes to their personal information by contacting us at info@cameron-porter.com.
          </Body>
        </Section>

        <Section title="Third-Party Services">
          <Body>
            The App integrates with third-party services — Supabase and RevenueCat — each governed by their own privacy policies. We are not responsible for the privacy practices of these providers. We encourage you to review their policies. The App does not contain links to external websites or display third-party advertising.
          </Body>
        </Section>

        <Section title="Do Not Track">
          <Body>
            The App does not track users across third-party websites or services. We honor Do Not Track signals where applicable.
          </Body>
        </Section>

        <Section title="International Users">
          <Body>
            If you access the App from outside the United States, your information will be transferred to, stored, and processed in the United States. By using the App, you consent to this transfer and to the use of your data as described in this policy.
          </Body>
        </Section>

        <Section title="Changes to This Policy">
          <Body>
            We may update this Privacy Policy at any time. Changes will be posted within the App with an updated "Last updated" date. Continued use of the App after changes constitutes your acceptance of the revised policy.
          </Body>
        </Section>

        <Section title="Contact Us">
          <Body>If you have any questions about this Privacy Policy, please contact us:</Body>
          <View style={{ marginTop: 10 }}>
            <Bullet>Email: info@cameron-porter.com</Bullet>
            <Bullet>App: GRIT — Hypertrophy Training</Bullet>
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}
