import Script from "next/script";
import { GOOGLE_ADS_ID } from "@/lib/analytics/google-ads";

export function Analytics() {
  const ga = process.env.NEXT_PUBLIC_GA_ID;
  const pixel = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  // One gtag.js serves both: Google Ads always, GA4 when its id is set.
  const tagIds = [GOOGLE_ADS_ID, ga].filter(Boolean) as string[];

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${tagIds[0]}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          ${tagIds.map((id) => `gtag('config', '${id}');`).join("\n          ")}
        `}
      </Script>
      {pixel && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixel}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}
