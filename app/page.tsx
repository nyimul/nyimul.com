
export default function Home() {
  return (
    <main className="bg-neutral-900 text-white min-h-screen px-8 pb-16">
      <div className="relative h-screen">
        <nav className="flex justify-between items-center pt-12">
          <span className="text-lg">Nyimul</span>
          <div className="flex gap-8">
            <a href="#">Photography</a>
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
                <clipPath id="headshot-clip">
                  <circle cx="102" cy="102" r="88" />
                </clipPath>
                {/* Each mask has a fat-stroked circle that sweeps from a starting angle,
                    progressively revealing the decorative dashed circle beneath */}
                <mask id="mask-c1">
                  <circle cx="102" cy="102" r="88"
                    stroke="white" strokeWidth="12" fill="none"
                    strokeDasharray="553 553" strokeDashoffset="553"
                    transform="rotate(75, 102, 102)">
                    <animate attributeName="stroke-dashoffset"
                      from="553" to="0" dur="5s" begin="0s" fill="freeze" />
                  </circle>
                </mask>
                <mask id="mask-c2">
                  <circle cx="102" cy="102" r="93"
                    stroke="white" strokeWidth="12" fill="none"
                    strokeDasharray="584 584" strokeDashoffset="584"
                    transform="rotate(137, 102, 102)">
                    <animate attributeName="stroke-dashoffset"
                      from="584" to="0" dur="5s" begin="5s" fill="freeze" />
                  </circle>
                </mask>
                <mask id="mask-c3">
                  <circle cx="102" cy="102" r="99"
                    stroke="white" strokeWidth="12" fill="none"
                    strokeDasharray="622 622" strokeDashoffset="622"
                    transform="rotate(215, 102, 102)">
                    <animate attributeName="stroke-dashoffset"
                      from="622" to="0" dur="5s" begin="10s" fill="freeze" />
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

              <circle cx="102" cy="102" r="88"
                fill="none" stroke="#EFD8C8" strokeWidth="2"
                strokeDasharray="17 14 20 16 15 11 21 17 16 15 18 10"
                mask="url(#mask-c1)" />
              <circle cx="102" cy="102" r="93"
                fill="none" stroke="#D85A30" strokeWidth="1.5"
                strokeDasharray="12 10 18 13 14 16 20 11"
                mask="url(#mask-c2)" />
              <circle cx="102" cy="102" r="99"
                fill="none" stroke="#C87941" strokeWidth="2"
                strokeDasharray="10 13 17 12 15 10 19 14"
                mask="url(#mask-c3)" />
            </svg>
            <h1 className="text-5xl text-center">Hi, I&apos;m Nyimul Hoque!</h1>
          </div>
        </section>
      </div>
      <section className="mt-24">
        <h2>About me:</h2>
        <p>Placeholder</p>
      </section>
      <section className="mt-24">
        <h2>Experience</h2>
      </section>
      <section className="mt-24">
        <h2>Projects</h2>
      </section>
      <section className="mt-24">
        <h2>Contact</h2>
      </section>
    </main>
  );
}
