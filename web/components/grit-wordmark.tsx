export function GritWordmark({ size = 'lg', showTagline = true }: { size?: 'sm' | 'md' | 'lg'; showTagline?: boolean }) {
  const className = `grit-wordmark grit-wordmark-${size}`;
  return <div className={className} aria-label="G.R.I.T. Guided Results and Intelligent Training">
    <div className="grit-wordmark-letters" aria-hidden="true"><span>G</span><span>.</span><span>R</span><span>.</span><span>I</span><span>.</span><span>T</span><span>.</span></div>
    {showTagline && <div className="grit-wordmark-tagline">Guided Results &amp; Intelligent Training</div>}
  </div>;
}
