import fs from "node:fs";
import path from "node:path";
import Image from "next/image";

/**
 * Phase — Client Testimonials, editorial redesign: author avatars,
 * decorative serif quotation mark, warm parchment section, fitted black
 * role badges and a "Verified Client" footer per card.
 *
 * Avatar: points to /New images/person.jpg by default. Until that file
 * is added to the folder, a terracotta monogram circle renders instead
 * (checked at build time) — so the live site never shows a broken image.
 */

const AVATAR_SRC = "/New images/person.jpeg";

function avatarAvailable(): boolean {
  try {
    return fs.existsSync(
      path.join(process.cwd(), "public", "New images", "person.jpeg"),
    );
  } catch {
    return false;
  }
}

const testimonials = [
  {
    role: "DOCTOR",
    author: "Physician, 40s",
    sub: "Virtual Client • Texas",
    avatar: AVATAR_SRC,
    paragraphs: [
      "“I spend most of my day being the person other people turn to. Patients need reassurance, colleagues need answers, family needs you to be present. After a while, I realized I had become very good at looking composed while feeling completely exhausted underneath.",
      "What surprised me about working with Fahd was how quickly I stopped feeling like I had to have the right words. Some conversations made me notice things I had been carrying for years without ever naming them.",
      "I still have a demanding life. That hasn’t changed. But I understand myself differently now, and I’m no longer trying to carry everything quietly.”",
    ],
  },
  {
    role: "ENTREPRENEUR",
    author: "Founder & Entrepreneur, 30s",
    sub: "Virtual Client • Texas",
    avatar: AVATAR_SRC,
    paragraphs: [
      "“When you build a business from nothing, it becomes personal. Every win feels like proof that you’re doing something right, and every setback somehow feels like a judgment on you. I didn’t realize how much of my identity had become tied to the business succeeding.",
      "I came to Fahd thinking I needed help dealing with stress. What we ended up talking about went much deeper than work.",
      "Those conversations have changed the way I lead, but more importantly, they’ve changed the way I live when I’m not working.”",
    ],
  },
  {
    role: "BUSINESS EXECUTIVE",
    author: "Senior Business Executive, 40s",
    sub: "Virtual Client • Texas",
    avatar: AVATAR_SRC,
    paragraphs: [
      "“From the outside, things were going well. I had a senior position, a good income, and a family I loved. I couldn’t really explain why I felt so disconnected from all of it.",
      "Fahd never made me feel ungrateful for struggling. He listened, but he also asked the kind of questions that stayed with me after the session was over.",
      "I’m still ambitious. I still care deeply about my career. I just don’t feel like I have to lose myself inside it anymore.”",
    ],
  },
];

export default function Testimonials() {
  const hasAvatar = avatarAvailable();

  return (
    <section id="testimonials" className="bg-[#F4ECE1] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#A8532B]">
            Client Experiences
          </span>
          <h2 className="font-serif text-3xl tracking-tight text-[#1A1A1A] md:text-5xl">
            Reflections from Those Who&apos;ve Done the Work
          </h2>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-3">
          {testimonials.map((item) => (
            <div
              key={item.role}
              className="relative flex flex-col justify-between overflow-hidden border border-black/10 bg-[#FAF6F0] p-8 shadow-sm md:p-10"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-2 right-4 select-none font-serif text-8xl text-black/5"
              >
                “
              </div>

              <div>
                {/* Author Info & Avatar */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#A8532B] shadow-sm md:h-16 md:w-16">
                    {hasAvatar ? (
                      <Image
                        alt={`Portrait representing ${item.author}`}
                        className="object-cover"
                        fill
                        sizes="64px"
                        src={item.avatar}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-full w-full items-center justify-center bg-[#A8532B]/15 font-serif text-xl font-bold text-[#A8532B]"
                      >
                        {item.author.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="inline-block bg-black px-2 py-0.5 font-serif text-xs font-bold uppercase tracking-wider text-white md:text-sm">
                      {item.role}
                    </span>
                    <p className="mt-1 text-xs font-medium tracking-wide text-[#1A1A1A]/70 md:text-sm">
                      {item.author}
                    </p>
                  </div>
                </div>

                {/* Quote Paragraphs */}
                <div className="space-y-3 text-sm leading-relaxed text-[#2B2B2B] md:text-[15px]">
                  {item.paragraphs.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-8 flex items-center justify-between gap-2 border-t border-black/10 pt-4 text-xs font-semibold uppercase tracking-wider text-[#A8532B]">
                <span>{item.sub}</span>
                <span>Verified Client</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
