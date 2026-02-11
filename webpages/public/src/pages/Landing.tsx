import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Link, useNavigate } from 'react-router-dom'
import { Truck, Clock, MapPin, ShieldCheck, Leaf, Headphones, ArrowRight } from 'lucide-react'

export default function Landing() {
    const navigate = useNavigate()
    const [tn, setTn] = useState('')
    return (
        <div className="space-y-12">
            {/* Hero - full-bleed */}
            <section className="relative left-1/2 -ml-[50vw] w-screen overflow-hidden">
                {/* Light blue background - left half */}
                <div className="absolute inset-y-0 left-0 w-full lg:w-[55%] bg-sky-100" />

                {/* Hero image - right side */}
                <div className="absolute inset-y-0 right-0 w-[45%] hidden lg:block">
                    <img
                        src="https://www.gls-us.com/getattachment/7f09668a-7340-46f6-b6b1-91637e03ebca/Home-Page-New.jpg"
                        alt="Futár csomagot kézbesít"
                        className="h-full w-full object-cover object-center"
                        loading="eager"
                    />
                </div>

                <div className="relative mx-auto max-w-7xl px-6 sm:px-10 lg:px-0">
                    <div className="relative z-10 min-h-[580px] flex items-center lg:-ml-16">
                        {/* Content - left side */}
                        <div className="max-w-2xl py-16 sm:py-20">
                            {/* Title card with arrow wrapper */}
                            <div className="relative mb-24">
                                {/* GLS arrow SVG wrapping around the card */}
                                <img
                                    src="https://www.gls-us.com/content/assets/images/home-hero-arrow.svg"
                                    alt=""
                                    aria-hidden="true"
                                    className="pointer-events-none absolute -top-10 -left-2 w-[calc(120%+280px)] h-auto hidden lg:block z-0 scale-[1.3] origin-top-left"
                                />

                                {/* Title card */}
                                <div className="relative z-10 p-8">
                                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl leading-tight">
                                        Gyors csomagszállítás országszerte!
                                    </h1>
                                </div>
                            </div>

                            {/* Tabs row */}
                            <div className="flex flex-wrap items-center gap-10 text-base font-semibold mb-4">
                                <button className="text-primary border-b-2 border-primary pb-1">Csomagkövetés</button>
                                <span className="text-gray-600 hover:text-gray-900 cursor-pointer">Árak és szállítási idők</span>
                                <span className="text-gray-600 hover:text-gray-900 cursor-pointer">GLS csomagpont keresés</span>
                            </div>

                            {/* Tracking widget */}
                            <div className="bg-white rounded-xl p-5 shadow-sm max-w-lg">
                                <p className="text-center text-sm text-gray-600 font-medium mb-4">
                                    Adja meg a csomagszámot vagy referenciaszámot a csomag követéséhez
                                </p>
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={tn}
                                        onChange={(e) => setTn(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && tn.trim()) navigate(`/tracking?q=${encodeURIComponent(tn)}`) }}
                                        placeholder="Csomagszám megadása"
                                        inputMode="text"
                                        className="h-12 rounded-full bg-gray-50 border-gray-200 px-5 text-gray-900 placeholder:text-gray-400 focus:border-primary"
                                    />
                                    <Button
                                        size="icon"
                                        className="h-12 w-12 rounded-full shrink-0 bg-primary hover:bg-primary/90"
                                        onClick={() => navigate(`/tracking?q=${encodeURIComponent(tn)}`)}
                                        disabled={!tn.trim()}
                                        aria-label="Követés indítása"
                                    >
                                        <ArrowRight className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Value props */}
            <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
                <ValueCard icon={<Truck className="h-6 w-6" />} title="Közúti szállítás" desc="Megbízható, határidős kézbesítés egész Magyarországon." />
                <ValueCard icon={<Clock className="h-6 w-6" />} title="Időben érkezik" desc="Működésünk a megbízhatóságra és gyorsaságra épül." />
                <ValueCard icon={<MapPin className="h-6 w-6" />} title="Lefedettség" desc="Országos hálózat több mint 1000 csomagponttal." />
                <ValueCard icon={<ShieldCheck className="h-6 w-6" />} title="Nyugodt szív" desc="Valós idejű követés és értesítések minden lépésnél." />
            </section>

            {/* Features with imagery */}
            <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 lg:grid-cols-3">
                <FeatureCard
                    img="https://www.gls-us.com/getattachment/f8a9e7f9-e090-4e3c-9590-61ac1f394869/shipping-wine.jpg"
                    title="Borküldés"
                    desc="Mint a borküldés vezető regionális szolgáltatója, kiváló minőségű szolgáltatást nyújtunk a borászatoknak."
                    ctaLabel="Tovább"
                    ctaHref="https://www.gls-hungary.com/hu/szolgaltatasok"
                />
                <FeatureCard
                    img="https://www.gls-us.com/getmedia/5e6601f2-aafd-4519-9d38-62fcc08accbb/GLS-ePostGlobal.png"
                    title="Kövesse nyomon csomagját"
                    desc="Megosztható linkek, szkennelés a főbb pontokon, és egyértelmű kézbesítési frissítések."
                    ctaLabel="Csomag követése"
                    internalCtaTo="/tracking"
                />
                <FeatureCard
                    img="https://www.gls-us.com/getattachment/88585423-7431-4d32-891b-43edd678e875/Parcel-Forum-24-Pic-12.jpg"
                    title="Közelgő események"
                    desc="Találkozzon a GLS csapatával egy Önhöz közeli eseményen - örömmel megosztjuk, min dolgozunk. Látogasson el hozzánk!"
                    ctaLabel="Tovább"
                    ctaHref="https://www.gls-hungary.com/hu/rolunk"
                />
            </section>

            {/* Support / Contact strip */}
            <section className="mx-auto max-w-6xl rounded-xl border bg-card p-6 sm:p-8 px-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <SupportItem icon={<Headphones className="h-5 w-5" />} title="Ügyfélszolgálat" href="https://www.gls-hungary.com/hu/kapcsolat" label="Segítség" />
                    <SupportItem icon={<MapPin className="h-5 w-5" />} title="Csomagpont keresés" href="https://www.gls-hungary.com/hu/csomagpont-kereso" label="Keresés" />
                    <SupportItem icon={<Leaf className="h-5 w-5" />} title="Zöld kezdeményezés" href="https://www.gls-hungary.com/hu/rolunk/fenntarthatosag" label="Felfedezés" />
                </div>
            </section>
        </div>
    )
}

function ValueCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
    return (
        <Card className="h-full border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-2">
                <div className="flex items-center gap-3 text-primary">
                    {icon}
                    <span className="text-base font-semibold">{title}</span>
                </div>
                <CardDescription className="text-sm">{desc}</CardDescription>
            </CardHeader>
        </Card>
    )
}

function FeatureCard({
    img,
    title,
    desc,
    ctaLabel,
    ctaHref,
    internalCtaTo,
}: {
    img: string
    title: string
    desc: string
    ctaLabel: string
    ctaHref?: string
    internalCtaTo?: string
}) {
    const cardContent = (
        <Card className="overflow-hidden border shadow-md hover:shadow-xl transition-all duration-300 h-full bg-card group cursor-pointer hover:-translate-y-1 flex flex-col">
            <div className="h-48 overflow-hidden">
                <img src={img} alt={title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
            </div>
            <CardHeader className="flex-1">
                <CardTitle className="text-xl group-hover:text-primary transition-colors">{title}</CardTitle>
                <CardDescription>{desc}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 mt-auto">
                <Button variant="outline" className="group-hover:bg-primary group-hover:text-white transition-colors">{ctaLabel}</Button>
            </CardContent>
        </Card>
    )

    if (internalCtaTo) {
        return (
            <Link to={internalCtaTo} className="block h-full">
                {cardContent}
            </Link>
        )
    }

    return (
        <a href={ctaHref} target="_blank" rel="noreferrer" className="block h-full">
            {cardContent}
        </a>
    )
}

function SupportItem({ icon, title, href, label }: { icon: React.ReactNode; title: string; href: string; label: string }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
                <span className="text-primary">{icon}</span>
                <div>
                    <div className="font-medium">{title}</div>
                    <div className="text-xs text-muted-foreground">Hasznos eszközök és források</div>
                </div>
            </div>
            <a href={href} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">{label}</Button>
            </a>
        </div>
    )
}
