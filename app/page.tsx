import Link from 'next/link'
import Header from '@/components/Header'
import WaveTexture from '@/components/WaveTexture'
import HeroBackground from '@/components/HeroBackground'
import DonationButton from '@/components/DonationButton'
import { getFeaturedContent } from '@/lib/content'
import { getSiteConfig } from '@/lib/config'

export const metadata = {
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default async function HomePage() {
  const featured = await getFeaturedContent()
  const config = getSiteConfig()

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

      <DonationButton />
    </>
  )
}
