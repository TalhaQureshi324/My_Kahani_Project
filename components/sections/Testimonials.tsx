/**
 * Section — Client Testimonials: editorial review cards directly after
 * "Why Work With Me". Warm cream cards on the site palette, fitted
 * black role badges matching the services headings, serif editorial
 * heading. Static server component — no client JS.
 */

type Testimonial = {
  role: string;
  paragraphs: string[];
  attribution: string;
};

const testimonials: Testimonial[] = [
  {
    role: "Doctor",
    attribution: "— Physician, 40s",
    paragraphs: [
      "“I spend most of my day being the person other people turn to. Patients need reassurance, colleagues need answers, family needs you to be present. After a while, I realized I had become very good at looking composed while feeling completely exhausted underneath.",
      "What surprised me about working with Fahd was how quickly I stopped feeling like I had to have the right words. There was no pressure to explain myself perfectly. Some conversations made me notice things I had been carrying for years without ever really naming them.",
      "I still have a demanding life. That hasn’t changed. But I understand myself differently now, and I’m no longer trying to carry everything quietly.”",
    ],
  },
  {
    role: "Entrepreneur",
    attribution: "— Founder & Entrepreneur, 30s",
    paragraphs: [
      "“When you build a business from nothing, it becomes personal. Every win feels like proof that you’re doing something right, and every setback somehow feels like a judgment on you. I didn’t realize how much of my identity had become tied to whether the business was succeeding.",
      "I came to Fahd thinking I needed help dealing with stress. What we ended up talking about went much deeper than work.",
      "For the first time in a long time, I started asking myself what I actually wanted, not what the business needed, not what people expected from me, and not what would look successful from the outside.",
      "Those conversations have changed the way I lead, but more importantly, they’ve changed the way I live when I’m not working.”",
    ],
  },
  {
    role: "Business Executive",
    attribution: "— Senior Business Executive, 40s",
    paragraphs: [
      "“From the outside, things were going well. I had a senior position, a good income, a family I loved and a career I had worked years to build. I couldn’t really explain why I felt so disconnected from all of it.",
      "I almost cancelled my first session because a part of me kept saying, ‘What exactly are you going to talk about? Your life is fine.’",
      "Fahd never made me feel ungrateful for struggling. He listened, but he also asked the kind of questions that stayed with me after the session was over. Slowly, I began to see how much of my life had been built around being responsible, dependable and in control.",
      "I’m still ambitious. I still care deeply about my career. I just don’t feel like I have to lose myself inside it anymore.”",
    ],
  },
];

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <article className="flex h-full flex-col justify-between rounded-lg border border-black/10 bg-[#F9F6F0] p-8 md:p-10">
      <div>
        <span className="inline-block bg-black px-3 py-1 font-serif text-xs font-bold uppercase tracking-wider text-white">
          {t.role}
        </span>
        <div className="mt-6 space-y-4">
          {t.paragraphs.map((p) => (
            <p
              key={p.slice(0, 24)}
              className="text-sm leading-relaxed text-[#1A1A1A]/80"
            >
              {p}
            </p>
          ))}
        </div>
      </div>
      <p className="mt-6 border-t border-black/10 pt-4 font-sans text-sm font-medium tracking-wide text-[#A8532B]">
        {t.attribution}
      </p>
    </article>
  );
}

export default function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-24 bg-[#F5EFE6] py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <p className="flex justify-center">
          <span className="inline-block bg-black px-3 py-1 font-serif text-xs font-bold uppercase tracking-wider text-white">
            Client Experiences
          </span>
        </p>
        <h2 className="mt-8 mb-12 text-center font-serif text-3xl text-[#1A1A1A] md:text-5xl">
          Reflections from Those Who&apos;ve Done the Work
        </h2>
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-3">
          {testimonials.map((t) => (
            <TestimonialCard key={t.role} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
