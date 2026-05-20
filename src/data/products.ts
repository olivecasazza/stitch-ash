export type Product = {
  slug: string;
  name: string;
  type: string;
  price: string;
  image: string;
  alt: string;
  accent: string;
  description: string;
  details: string[];
};

export const products: Product[] = [
  {
    slug: 'ossify-hoodie',
    name: 'Ossify Hoodie',
    type: 'Oversized black pullover hoodie',
    price: '$148',
    image: '/assets/1-bone-rib-hoodie.svg',
    alt: 'Oversized black hoodie with bone-thread ribcage embroidery anchored by a broken-circle sternum motif',
    accent: 'Bone-rib embroidery across the chest',
    description: 'A heavyweight pullover built around structural bone-thread embroidery that spreads across the chest instead of sitting on top as a logo.',
    details: ['Heavyweight black fleece', 'Bone thread ribcage embroidery', 'Oversized pullover silhouette']
  },
  {
    slug: 'kiln-drape-tunic',
    name: 'Kiln Drape Tunic',
    type: 'Asymmetric black cowl tunic',
    price: '$132',
    image: '/assets/2-ember-cowl-tunic.svg',
    alt: 'Asymmetric black cowl tunic with ember-thread broken-circle embroidery glowing along the draped hem',
    accent: 'Ember halo embroidery at the draped hem',
    description: 'An elongated cowl silhouette with layered ember threadwork placed low on the drape so the stitchwork feels like heat escaping fabric.',
    details: ['Asymmetric cowl neckline', 'Draped elongated body', 'Ember thread hem embroidery']
  },
  {
    slug: 'scaffold-work-jacket',
    name: 'Scaffold Canvas Work Jacket',
    type: 'Boxy black canvas work jacket',
    price: '$188',
    image: '/assets/3-void-work-jacket.svg',
    alt: 'Boxy black canvas work jacket with tonal ash scaffold embroidery and small ember nodes on the lower panel',
    accent: 'Tonal ash scaffold embroidery with ember nodes',
    description: 'A structured canvas jacket where tonal ash thread maps across the pocket and lower panel with restrained ember nodes for a quiet focal point.',
    details: ['Heavy black canvas shell', 'Tonal ash scaffold embroidery', 'Subtle left-chest monogram']
  }
];

export const getProduct = (slug: string) => products.find((product) => product.slug === slug);
