import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen px-8 pb-16 relative" style={{backgroundColor: '#1C1914'}}>
      {/* Cloth texture: SVG warp/weft grid fixed over the entire page */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="cloth" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="8" y2="0" stroke="#A08B6B" strokeWidth="0.5" opacity="0.08" />
            <line x1="0" y1="4" x2="8" y2="4" stroke="#A08B6B" strokeWidth="0.3" opacity="0.06" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#A08B6B" strokeWidth="0.5" opacity="0.05" />
            <line x1="4" y1="0" x2="4" y2="8" stroke="#A08B6B" strokeWidth="0.3" opacity="0.04" />
          </pattern>
          <pattern id="cloth-weave" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="4" height="4" fill="#A08B6B" opacity="0.04" />
            <rect x="4" y="4" width="4" height="4" fill="#A08B6B" opacity="0.04" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cloth)" />
        <rect width="100%" height="100%" fill="url(#cloth-weave)" />
      </svg>
      <div className="relative h-screen">
        <nav className="flex justify-between items-center pt-12">
          <Link href="/" aria-label="Home">
            {/* Kantha flower logo — 4 wide petals + 4 teal leaves between them */}
            <svg width="100" height="100" viewBox="-30 -30 60 60" fill="none" strokeLinecap="round">
              {/* Amber center eye */}
              <circle cx="0" cy="0" r="2" stroke="#E8A84C" strokeWidth="1.5" strokeDasharray="1 2"/>
              {/* Red center ring */}
              <circle cx="0" cy="0" r="6" stroke="#E24B4A" strokeWidth="2" strokeDasharray="2 2.5"/>
              {/* 4 wide cardinal petals — wide lateral control point makes them rounded, not spiky */}
              <path d="M0 -8 Q11 -15 0 -24 Q-11 -15 0 -8" stroke="#D85A30" strokeWidth="1.5" strokeDasharray="2 3"/>
              <path d="M0 -8 Q11 -15 0 -24 Q-11 -15 0 -8" stroke="#E24B4A" strokeWidth="1.5" strokeDasharray="2 3" transform="rotate(90)"/>
              <path d="M0 -8 Q11 -15 0 -24 Q-11 -15 0 -8" stroke="#D85A30" strokeWidth="1.5" strokeDasharray="2 3" transform="rotate(180)"/>
              <path d="M0 -8 Q11 -15 0 -24 Q-11 -15 0 -8" stroke="#E24B4A" strokeWidth="1.5" strokeDasharray="2 3" transform="rotate(270)"/>
              {/* 4 teal leaves at 45° between petals */}
              <path d="M0 -8 Q6 -14 0 -19 Q-6 -14 0 -8" stroke="#1D9E75" strokeWidth="1.5" strokeDasharray="2 3" transform="rotate(45)"/>
              <path d="M0 -8 Q6 -14 0 -19 Q-6 -14 0 -8" stroke="#1D9E75" strokeWidth="1.5" strokeDasharray="2 3" transform="rotate(135)"/>
              <path d="M0 -8 Q6 -14 0 -19 Q-6 -14 0 -8" stroke="#1D9E75" strokeWidth="1.5" strokeDasharray="2 3" transform="rotate(225)"/>
              <path d="M0 -8 Q6 -14 0 -19 Q-6 -14 0 -8" stroke="#1D9E75" strokeWidth="1.5" strokeDasharray="2 3" transform="rotate(315)"/>
              {/* Pink dots at cardinal petal tips */}
              <circle cx="0" cy="-24" r="1.5" stroke="#D4537E" strokeWidth="1" strokeDasharray="1 2"/>
              <circle cx="0" cy="-24" r="1.5" stroke="#D4537E" strokeWidth="1" strokeDasharray="1 2" transform="rotate(90)"/>
              <circle cx="0" cy="-24" r="1.5" stroke="#D4537E" strokeWidth="1" strokeDasharray="1 2" transform="rotate(180)"/>
              <circle cx="0" cy="-24" r="1.5" stroke="#D4537E" strokeWidth="1" strokeDasharray="1 2" transform="rotate(270)"/>
              {/* Amber dots at leaf tips */}
              <circle cx="0" cy="-19" r="1.5" stroke="#E8A84C" strokeWidth="1" strokeDasharray="1 2" transform="rotate(45)"/>
              <circle cx="0" cy="-19" r="1.5" stroke="#E8A84C" strokeWidth="1" strokeDasharray="1 2" transform="rotate(135)"/>
              <circle cx="0" cy="-19" r="1.5" stroke="#E8A84C" strokeWidth="1" strokeDasharray="1 2" transform="rotate(225)"/>
              <circle cx="0" cy="-19" r="1.5" stroke="#E8A84C" strokeWidth="1" strokeDasharray="1 2" transform="rotate(315)"/>
            </svg>
          </Link>
          <div className="flex gap-8">
            {/* <a href="#">Photography</a> */}
            {/* <a href="#">Music</a> */}
            {/* <a href="#">Wedding</a> */}
            {/* <a href="#">Tax Return Video Game</a> */}
            {/* <a href="#">AI Guitar Tutor</a> */}
            {/* <a href="#">Omnichord Online</a> */}
          </div>
        </nav>
        <section className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-8">
            {/* placeholder circle: <div className="w-48 h-48 rounded-full bg-amber-200" /> */}
            <svg width="204" height="204" viewBox="0 0 204 204">
              <defs>
                {/* Photo clips to r=88 — innermost stitch ring at r=80 draws on top of it */}
                <clipPath id="headshot-clip">
                  <circle cx="102" cy="102" r="88" />
                </clipPath>
                <mask id="mask-c1">
                  <circle cx="102" cy="102" r="80"
                    stroke="white" strokeWidth="12" fill="none"
                    strokeDasharray="503 503" strokeDashoffset="503"
                    transform="rotate(70, 102, 102)">
                    <animate attributeName="stroke-dashoffset"
                      from="503" to="0" dur="5s" begin="0s" fill="freeze" />
                  </circle>
                </mask>
                <mask id="mask-c2">
                  <circle cx="102" cy="102" r="88"
                    stroke="white" strokeWidth="12" fill="none"
                    strokeDasharray="553 553" strokeDashoffset="553"
                    transform="rotate(75, 102, 102)">
                    <animate attributeName="stroke-dashoffset"
                      from="553" to="0" dur="5s" begin="5s" fill="freeze" />
                  </circle>
                </mask>
                <mask id="mask-c3">
                  <circle cx="102" cy="102" r="93"
                    stroke="white" strokeWidth="12" fill="none"
                    strokeDasharray="584 584" strokeDashoffset="584"
                    transform="rotate(137, 102, 102)">
                    <animate attributeName="stroke-dashoffset"
                      from="584" to="0" dur="5s" begin="10s" fill="freeze" />
                  </circle>
                </mask>
                <mask id="mask-c4">
                  <circle cx="102" cy="102" r="99"
                    stroke="white" strokeWidth="12" fill="none"
                    strokeDasharray="622 622" strokeDashoffset="622"
                    transform="rotate(215, 102, 102)">
                    <animate attributeName="stroke-dashoffset"
                      from="622" to="0" dur="5s" begin="15s" fill="freeze" />
                  </circle>
                </mask>
              </defs>

              {/* Headshot cropped to the inner circle */}
              {/* To reposition: adjust x/y to shift (negative = move image right/down into frame) */}
              {/* To rezoom: increase width/height (larger = zoomed out, smaller = zoomed in) */}
              <image
                href="/headshot_spain.jpg"
                x="-15"
                y="2"
                width="250"
                height="210"
                clipPath="url(#headshot-clip)"
                preserveAspectRatio="xMidYMid slice"
                opacity="0"
              >
                <animate attributeName="opacity" from="0" to="1" dur="0.8s" begin="0s" fill="freeze" />
              </image>

              {/* r=80 — sits inside the photo, looks stitched onto it */}
              <circle cx="102" cy="102" r="85"
                fill="none" stroke="#EFD8C8" strokeWidth="1.5"
                strokeDasharray="14 11 16 12 15 10"
                mask="url(#mask-c1)" />
              {/* r=88 — where innermost used to be */}
              <circle cx="102" cy="102" r="91"
                fill="none" stroke="#D85A30" strokeWidth="2"
                strokeDasharray="17 14 20 16 15 11 21 17 16 15 18 10"
                mask="url(#mask-c2)" />
              {/* r=93 — where 2nd used to be */}
              <circle cx="102" cy="102" r="96"
                fill="none" stroke="#C87941" strokeWidth="1.5"
                strokeDasharray="12 10 18 13 14 16 20 11"
                mask="url(#mask-c3)" />
              {/* r=99 — new outermost, warm golden yellow */}
              <circle cx="102" cy="102" r="101"
                fill="none" stroke="#E8C040" strokeWidth="2"
                strokeDasharray="10 13 17 12 15 10 19 14"
                mask="url(#mask-c4)" />
            </svg>
            <h1 className="text-5xl text-center">Hi! I&apos;m Nyimul.</h1>
          </div>
        </section>

        {/* Scroll-down arrow — stitches in left-to-right over 3s */}
        <a href="#about" className="absolute bottom-8 left-0 right-0 flex justify-center cursor-pointer">
          <svg width="80" height="32" viewBox="-40 -6 80 38" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <clipPath id="arrow-reveal">
                {/* Rect starts at left edge, width expands rightward to reveal the V */}
                <rect x="-40" y="-6" height="38" width="0">
                  <animate attributeName="width" from="0" to="80" dur="3s" begin="0.5s" fill="freeze"/>
                </rect>
              </clipPath>
            </defs>
            <path
              d="M-32 0 L0 24 L32 0"
              stroke="#C87941"
              strokeWidth="2"
              strokeDasharray="7 5"
              clipPath="url(#arrow-reveal)"
            />
          </svg>
        </a>
      </div>
      <section id="about" className="mt-24 max-w-2xl mx-auto">
        <h2 className="text-2xl mb-6">about me</h2>
        <p className="leading-relaxed">
          I&apos;m a software engineer focused on backend, data, and 
          full-stack development, with experience building scalable 
          healthcare systems using Python, PySpark, Databricks, Kafka, 
          Azure, .NET, Java, and React. Currently, I work at Humana on 
          intake and automation platforms that support large-scale 
          Medicare and Medicaid workflows. Outside of engineering, 
          I&apos;m passionate about music, photography, and building 
          creative, user-focused projects. This website will continue 
          to be updated with my projects.
        </p>
      </section>
      {/* <section className="mt-24">
        <h2>Experience</h2>
      </section>
      <section className="mt-24">
        <h2>Projects</h2>
      </section>
      <section className="mt-24">
        <h2>Contact</h2>
      </section> */}
    </main>
  );
}
