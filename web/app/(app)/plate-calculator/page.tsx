import { PlateCalculator } from '@/components/plate-calculator';

export default function PlateCalculatorPage() {
  return <main className="content">
    <header className="page-header"><div><div className="eyebrow">TOOLS</div><h1>Plate calculator</h1><p>Work out exactly which plates to load per side for a barbell lift.</p></div></header>
    <section className="surface"><PlateCalculator /></section>
  </main>;
}
