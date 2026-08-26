'use client';

import { useEffect } from 'react';

// Only fires when the root layout itself throws (very rare). Since it
// replaces the whole layout, it renders its own <html>/<body> and can't rely
// on globals.css class definitions loading reliably, so it's styled inline.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <html lang="en">
      <body style={{ margin:0,minHeight:'100dvh',display:'grid',placeItems:'center',padding:28,background:'#0b0d10',color:'#f5f7fa',fontFamily:'ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',textAlign:'center' }}>
        <div style={{ display:'grid',gap:10,justifyItems:'center',maxWidth:340 }}>
          <div aria-hidden="true" style={{ width:80,height:80,display:'grid',placeItems:'center',marginBottom:10,border:'1px solid rgba(255,255,255,.12)',borderRadius:'50%',background:'#15191f',color:'#2fbf8f',fontSize:36 }}>!</div>
          <h2 style={{ margin:0,fontSize:20,lineHeight:'24px' }}>Something went wrong</h2>
          <p style={{ margin:'0 0 14px',color:'#9ca3af',fontSize:14,lineHeight:'21px' }}>GRIT couldn&rsquo;t load. Try again in a moment.</p>
          <button type="button" onClick={() => reset()} style={{ display:'inline-flex',minHeight:48,alignItems:'center',justifyContent:'center',border:0,borderRadius:14,padding:'0 22px',fontWeight:750,cursor:'pointer',background:'#2fbf8f',color:'#0b0d10' }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
