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

export default function TermsOfService() {
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
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', flex: 1 }}>Terms of Service</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 24 }}>Last updated: June 25, 2026</Text>

        <Section title="Agreement">
          <Body>
            This End User License Agreement ("Agreement" or "Terms") governs your use of the GRIT — Hypertrophy Training mobile application ("App"), owned and operated by Cameron Porter ("we," "us," or "our"). By downloading, installing, or using the App, you agree to these Terms. If you do not agree, do not use the App.
          </Body>
        </Section>

        <Section title="License">
          <Body>
            We grant you a personal, non-exclusive, non-transferable, revocable license to use the App for your own personal fitness tracking and training purposes. You may not copy, modify, distribute, sell, or sublicense any part of the App. All content and intellectual property within the App is owned by or licensed to us. We may revoke this license at any time for violations of these Terms.
          </Body>
        </Section>

        <Section title="Not Medical Advice">
          <Body>
            THE APP IS NOT INTENDED TO PROVIDE MEDICAL ADVICE. The training programs, volume recommendations, and exercise suggestions are for general fitness purposes only and do not constitute professional medical advice, diagnosis, or treatment.
          </Body>
          <View style={{ marginTop: 10 }}>
            <Bullet>Always consult your physician or qualified healthcare provider before beginning any new exercise program, especially if you have any pre-existing medical conditions or injuries</Bullet>
            <Bullet>Stop exercising immediately and seek medical attention if you experience chest pain, dizziness, shortness of breath, or other unusual symptoms</Bullet>
            <Bullet>In an emergency, call 911 or your local emergency services</Bullet>
            <Bullet>You assume all risk associated with your use of the App and participation in any training activities</Bullet>
          </View>
        </Section>

        <Section title="Age Requirement">
          <Body>
            The App is intended for individuals 18 years of age and older. By using the App, you confirm that you are at least 18 years old. We do not knowingly permit individuals under 18 to create accounts or use the Service.
          </Body>
        </Section>

        <Section title="Account">
          <Body>You must create an account to use the App. You agree to:</Body>
          <View style={{ marginTop: 10 }}>
            <Bullet>Provide accurate and truthful information when registering</Bullet>
            <Bullet>Keep your login credentials confidential and not share them with others</Bullet>
            <Bullet>Notify us promptly at info@cameron-porter.com if you believe your account has been compromised</Bullet>
            <Bullet>Take responsibility for all activity that occurs under your account</Bullet>
          </View>
        </Section>

        <Section title="Subscriptions and Billing">
          <Body>
            The App offers a subscription ("GRIT Pro") that unlocks full access to all features. Subscriptions are billed through the Google Play Store or Apple App Store depending on your device. By subscribing, you agree to those stores' billing terms.
          </Body>
          <View style={{ marginTop: 10 }}>
            <Bullet>A 7-day free trial may be available for new subscribers; you will be charged at the end of the trial period unless you cancel before it ends</Bullet>
            <Bullet>Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period</Bullet>
            <Bullet>To cancel, manage your subscription through the Google Play Store or Apple App Store settings</Bullet>
            <Bullet>Refunds are governed by the applicable store's refund policy; contact Google Play or Apple Support for refund requests</Bullet>
            <Bullet>We reserve the right to change subscription pricing with advance notice</Bullet>
          </View>
        </Section>

        <Section title="Acceptable Use">
          <Body>You may use the App only for lawful personal fitness purposes. You agree not to:</Body>
          <View style={{ marginTop: 10 }}>
            <Bullet>Use the App to violate any applicable law or regulation</Bullet>
            <Bullet>Attempt to reverse-engineer, decompile, or extract the App's source code</Bullet>
            <Bullet>Use the App to harm, defraud, or harass any person</Bullet>
            <Bullet>Interfere with or disrupt the App's servers, networks, or infrastructure</Bullet>
            <Bullet>Transmit viruses, malware, or any other harmful code</Bullet>
            <Bullet>Attempt to gain unauthorized access to any part of the App or its backend systems</Bullet>
            <Bullet>Share your account with others or allow others to use your credentials</Bullet>
          </View>
        </Section>

        <Section title="Your Content">
          <Body>
            You may enter workout notes, program names, and other content into the App. You retain ownership of your content but grant us a limited license to store and process it solely to provide the Service. You are responsible for the content you enter. We reserve the right to remove any content that violates these Terms.
          </Body>
        </Section>

        <Section title="Disclaimer of Warranties">
          <Body>
            THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. YOUR USE OF THE APP IS AT YOUR SOLE RISK.
          </Body>
        </Section>

        <Section title="Limitation of Liability">
          <Body>
            TO THE FULLEST EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE APP, INCLUDING BUT NOT LIMITED TO PERSONAL INJURY, PROPERTY DAMAGE, LOST PROFITS, OR DATA LOSS. TO THE EXTENT LIABILITY CANNOT BE EXCLUDED, OUR TOTAL LIABILITY TO YOU SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE APP IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR $1.00 USD IF YOU HAVE NOT MADE ANY PAYMENTS.
          </Body>
        </Section>

        <Section title="Privacy">
          <Body>
            Your use of the App is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the App, you consent to the collection and use of your information as described in the Privacy Policy.
          </Body>
        </Section>

        <Section title="DMCA Copyright Notice">
          <Body>
            If you believe any content in the App infringes your copyright, please send a written notice to info@cameron-porter.com including: (1) identification of the copyrighted work; (2) identification of the allegedly infringing material and its location; (3) your contact information; (4) a statement of good faith belief that the use is unauthorized; and (5) a statement under penalty of perjury that you are the copyright owner or authorized to act on their behalf.
          </Body>
        </Section>

        <Section title="Governing Law">
          <Body>
            These Terms are governed by the laws of the State of Michigan, United States of America, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the App shall be resolved through binding arbitration in Michigan, and you waive any right to a jury trial or class action lawsuit to the fullest extent permitted by law.
          </Body>
        </Section>

        <Section title="Changes to These Terms">
          <Body>
            We reserve the right to modify these Terms at any time. Updated Terms will be posted within the App with a revised "Last updated" date. Your continued use of the App after changes are posted constitutes acceptance of the new Terms.
          </Body>
        </Section>

        <Section title="Termination">
          <Body>
            We may suspend or terminate your access to the App at any time for violation of these Terms, without prior notice or liability. Upon termination, your right to use the App ceases immediately. Provisions that by their nature should survive termination (warranty disclaimers, limitation of liability, governing law) will survive.
          </Body>
        </Section>

        <Section title="Contact Us">
          <Body>If you have any questions about these Terms, please contact us:</Body>
          <View style={{ marginTop: 10 }}>
            <Bullet>Email: info@cameron-porter.com</Bullet>
            <Bullet>App: GRIT — Hypertrophy Training</Bullet>
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}
