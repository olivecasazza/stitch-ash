import {Link, type MetaFunction} from 'react-router';

export const meta: MetaFunction = () => [{title: 'STITCH AND ASH'}];

const PRODUCTS = [
  {
    handle: 'sku-001',
    name: 'Embroidered Hoodie',
    price: '$185',
    note: 'Black thread on black cotton. Chest design, sleeve mark.',
  },
  {
    handle: 'sku-002',
    name: 'Embroidered Lanyard',
    price: '$35',
    note: 'Heavy woven black fabric. Repeated brand mark along length.',
  },
  {
    handle: 'sku-003',
    name: 'Embroidered Sticker',
    price: '$15',
    note: 'Fully stitched black-on-black patch with adhesive backing.',
  },
];

export default function Homepage() {
  return (
    <main className="min-h-screen bg-[#080706] text-[#e7dfd2]">
      <section className="mx-auto max-w-6xl px-6 py-28 text-center">
        <p className="mb-8 font-mono text-xs uppercase tracking-[0.45em] text-[#8b8174]">Hydrogen preview</p>
        <h1 className="font-serif text-6xl uppercase tracking-tight md:text-8xl">STITCH &amp; ASH</h1>
        <p className="mx-auto mt-8 max-w-2xl font-mono text-sm leading-7 text-[#b9b0a4]">
          Embroidered apparel. STITCH is the craft. ASH is what it costs.
          Shopify is the commerce source of truth; Git/Nix owns catalog intent,
          shipping policy, and tracking operations.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-6 flex items-end justify-between border-b border-[#2b2722] pb-3">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-[#8b8174]">First capsule</p>
          <p className="font-mono text-xs text-[#6f675d]">declarative Shopify catalog</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {PRODUCTS.map(product => (
            <Link
              key={product.handle}
              to={`/products/${product.handle}`}
              className="group border border-[#2b2722] bg-[#0d0b0a] p-5 transition hover:border-[#e7dfd2]"
            >
              <div className="aspect-square border border-[#1e1a17] bg-[radial-gradient(circle_at_center,#181411,#080706_68%)]" />
              <div className="mt-5 flex items-start justify-between gap-4">
                <h2 className="font-mono text-sm uppercase tracking-[0.18em]">{product.name}</h2>
                <span className="font-mono text-sm text-[#8b8174]">{product.price}</span>
              </div>
              <p className="mt-4 font-mono text-xs leading-6 text-[#8b8174]">{product.note}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
