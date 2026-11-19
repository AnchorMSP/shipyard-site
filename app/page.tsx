import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import WaveTexture from '@/components/WaveTexture'
import HeroBackground from '@/components/HeroBackground'
import DonationButton from '@/components/DonationButton'
import { getAllContent, getFeaturedContent } from '@/lib/content'
import { getSiteConfig } from '@/lib/config'

const siteUrl = 'https://www.theshipyard.cc'

export const metadata: Metadata = {
  title: 'The Shipyard — A Writing Space for Essays and Creative Work',
  description:
    'The Shipyard is a writing space for essays and creative work about ideas, perception, and what it means to be human. Read every piece in the Basin archive.',
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: 'The Shipyard — A Writing Space for Essays and Creative Work',
    description:
      'A writing space for essays and creative work about ideas, perception, and what it means to be human.',
    url: siteUrl,
    siteName: 'The Shipyard',
    type: 'website',
  },
}

export default async function HomePage() {
  const featured = await getFeaturedContent()
  const config = getSiteConfig()
  const allContent = await getAllContent()
  const essayCount = allContent.filter((item) => item.type === 'essay').length
  const creativeCount = allContent.filter((item) => item.type === 'creative').length

  const faqs = [
    {
      question: 'What is The Shipyard?',
      answer:
        'The Shipyard is a writing space for essays and creative work. The name comes from a shipyard, a place where ships stop to rest and be repaired, and the site is built as a place for a weary traveler of the internet to stop, learn, repair, and grow.',
    },
    {
      question: 'What can I read on The Shipyard?',
      answer: `The site publishes essays and creative writing. It currently holds ${essayCount} essays and ${creativeCount} creative pieces, and the Basin archive lets readers browse them by type and tag.`,
    },
    {
      question: 'Where can I find all of the writing?',
      answer:
        'The full archive is at https://www.theshipyard.cc/basin. Every published piece also has its own reading page at https://www.theshipyard.cc.',
    },
    {
      question: 'What does the name The Shipyard mean?',
      answer:
        'A shipyard is a place where ships are built or repaired. The Shipyard borrows that idea for writing: a space of stored thoughts, theories, and questions, where readers can pause and reflect.',
    },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'The Shipyard',
        description:
          'A writing space for essays and creative work about ideas, perception, and what it means to be human.',
        inLanguage: 'en',
      },
      {
        '@type': 'FAQPage',
        '@id': `${siteUrl}/#faq`,
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ],
  }

  return (
    <>
      {/* Featured article banner */}
      {featured && (
        <section className="fixed top-0 left-0 right-0 z-40 py-3 px-4 md:px-8 bg-brand-off-white border-b border-brand-tan/20">
          <WaveTexture opacity={0.05} />

          <div className="relative z-10 max-w-4xl mx-auto flex items-center justify-center gap-4">
            <h2 className="font-display text-base md:text-lg font-light tracking-tight text-center">
              {featured.title}
            </h2>
            <Link
              href={`/${featured.slug}`}
              className="inline-flex items-center font-body text-xs text-brand-tan hover:text-brand-sage transition-colors whitespace-nowrap flex-shrink-0"
            >
              Read →
            </Link>
          </div>
        </section>
      )}

      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-end pb-20 overflow-hidden">
        {/* Background media */}
        <HeroBackground mediaUrl={config.backgroundMediaUrl} />

        {/* Hero content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-8">
          <h1 className="font-display text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tight leading-none mb-4 md:mb-6">
            The Shipyard
          </h1>
          <p className="font-body text-white/60 text-base md:text-lg max-w-xl mb-6 md:mb-8">
            A space for humans to just be.
          </p>
          <Link
            href="/basin"
            className="inline-block font-body text-sm text-brand-tan hover:text-white transition-colors"
          >
            View Basin →
          </Link>
        </div>
      </section>

      {/* Answer-first overview for search and AI answer engines */}
      <section className="relative bg-brand-off-white py-20 md:py-28 px-6 md:px-8">
        <WaveTexture opacity={0.05} />

        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-light tracking-tight mb-6">
            What is The Shipyard?
          </h2>

          <p className="font-body text-lg md:text-xl leading-relaxed text-brand-black/80 mb-10">
            The Shipyard is a writing space for essays and creative work — a place to stop, learn,
            repair, and grow. It collects thoughts, theories, and questions in a distraction-free
            reading experience at theshipyard.cc.
          </p>

          <h3 className="font-display text-xl md:text-2xl font-light tracking-tight mb-4">
            Facts and figures
          </h3>
          <dl className="grid grid-cols-2 gap-4 md:gap-6 mb-12 font-body">
            {[
              { label: 'Writing space', value: 'Essays and creative work' },
              { label: 'Published pieces', value: String(allContent.length) },
              { label: 'Essays', value: String(essayCount) },
              { label: 'Creative pieces', value: String(creativeCount) },
              { label: 'Full archive', value: '/basin' },
              { label: 'Site', value: 'theshipyard.cc' },
            ].map((fact) => (
              <div key={fact.label} className="border-t border-black/10 pt-3">
                <dt className="text-xs uppercase tracking-brand text-brand-tan mb-1">
                  {fact.label}
                </dt>
                <dd className="text-brand-black">{fact.value}</dd>
              </div>
            ))}
          </dl>

          <h3 className="font-display text-xl md:text-2xl font-light tracking-tight mb-6">
            Frequently asked questions
          </h3>
          <div className="space-y-6 mb-10">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <h4 className="font-body font-medium text-brand-black mb-2">{faq.question}</h4>
                <p className="font-body text-brand-gray leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>

          <Link
            href="/basin"
            className="inline-block font-body text-sm text-brand-tan hover:text-brand-sage transition-colors"
          >
            Browse the writing in Basin →
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <DonationButton />
    </>
  )
}
