/**
 * Public, crawlable pages for Reloop.
 *
 * These are real pages that describe the marketplace that already exists. Keep
 * the copy accurate: do not claim features, payment protection, delivery or
 * inventory that the app does not provide.
 */

export const PUBLIC_PAGES = {
  'how-it-works': {
    path: '/how-it-works',
    breadcrumb: 'How it works',
    title: 'How Reloop Works — Buy, Sell & Exchange Locally',
    description: 'Learn how to browse, list, offer and exchange pre-loved goods on Reloop. Post an item, message the seller and arrange a local handoff.',
    eyebrow: 'How Reloop works',
    heading: 'A simple loop for useful things.',
    lede: 'Reloop is a community marketplace for buying, selling and exchanging new and pre-loved goods nearby. Here is what happens from the first browse to the final handoff.',
    sections: [
      {
        heading: 'Start with what you need',
        paragraphs: [
          'Browse recent listings or search by item, category or place. You can look through clothing, home goods, tech and accessories without creating an account. When something catches your eye, save it to your basket or open the listing for the full details.',
        ],
      },
      {
        heading: 'Post an item with an honest history',
        paragraphs: [
          'When you are ready to pass something on, add a real photo, a clear title and the details a buyer needs. The listing form asks for the category, condition, quality, how long you have owned the item, the original price and your minimum cash offer. You can also say whether you will consider an exchange.',
        ],
        items: [
          'A real photo of the item',
          'An honest condition and quality description',
          'A minimum cash offer you would accept',
          'Your exchange preference',
        ],
      },
      {
        heading: 'Talk, offer or swap',
        paragraphs: [
          'Buyers can ask questions, make a cash offer, propose another item, or offer cash plus an item. Offers stay private between the buyer and the seller. Use messages to share extra photos, ask about condition and agree on what a fair exchange looks like.',
        ],
      },
      {
        heading: 'Arrange the handoff',
        paragraphs: [
          'Reloop does not process payments or arrange delivery. Once you agree, meet in a public place, inspect the item and complete the exchange directly. Tell someone where you are going and trust your instincts.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is Reloop a shop?',
        answer: 'No. Reloop is a community marketplace. Listings are posted by members, and the people involved arrange the handoff directly.',
      },
      {
        question: 'Does Reloop take payment?',
        answer: 'No. There is no checkout on Reloop. Members agree on payment or an exchange and complete it themselves.',
      },
      {
        question: 'Can I offer an item instead of cash?',
        answer: 'Yes. A buyer can offer cash, an item, or cash plus an item. The seller decides which offers to pursue.',
      },
      {
        question: 'What can I list?',
        answer: 'Clothing, home goods, tech and accessories are the main categories. Members can also list other useful items using the available category options.',
      },
      {
        question: 'How do I stay safe?',
        answer: 'Meet in a public place, inspect items before agreeing, avoid sharing sensitive personal information, and keep the conversation clear in the app.',
      },
    ],
    cta: {
      heading: 'Ready to pass something on?',
      body: 'Browse what is nearby, or post an item and see what the community offers.',
      primary: { label: 'Browse listings', href: '/#browse' },
      secondary: { label: 'Sell an item', href: '/sell' },
    },
  },

  sell: {
    path: '/sell',
    breadcrumb: 'Sell an item',
    title: 'Sell Pre-Loved Goods on Reloop — Post an Item',
    description: 'Turn things you no longer use into cash or an exchange. See what to include in a Reloop listing, how offers work and how to arrange a safe local handoff.',
    eyebrow: 'Selling on Reloop',
    heading: 'Sell or exchange what you no longer need.',
    lede: 'A clear photo and an honest description help the right person find your item. Reloop keeps the listing process simple and lets you decide which offers are worth pursuing.',
    sections: [
      {
        heading: 'What to prepare',
        paragraphs: [
          'A useful listing gives buyers enough information to decide without guessing. Gather these details before you start:',
        ],
        items: [
          'A real photo of the item',
          'A clear title and the right category',
          'Condition and quality',
          'How long you have owned it',
          'The original price and your minimum cash offer',
          'A description of any marks, faults or missing parts',
          'Whether you will consider an exchange',
        ],
      },
      {
        heading: 'Price it honestly',
        paragraphs: [
          'Set a minimum cash offer you would genuinely accept. It gives buyers a clear starting point. You can still consider an item exchange or a cash-plus-item offer, and you decide which offer to pursue.',
        ],
      },
      {
        heading: 'Write a listing that answers questions',
        paragraphs: [
          'Describe the condition, mention any marks or missing parts, and explain why you are passing the item on. A clear description reduces back-and-forth and helps the right buyer decide.',
        ],
      },
      {
        heading: 'Review offers privately',
        paragraphs: [
          'Offers are visible to you and the buyer, not the whole marketplace. Ask for more photos or details before you accept. You are never obliged to take the first offer.',
        ],
      },
      {
        heading: 'Hand over safely',
        paragraphs: [
          'Choose a public meeting place, bring someone if you can, and inspect the item together. Reloop does not collect payment, hold funds or arrange delivery.',
        ],
      },
    ],
    faq: [
      {
        question: 'What details do I need to post an item?',
        answer: 'You need a photo, title, category, condition, quality, how long you have owned it, the original price, a minimum cash offer, a description and your exchange preference.',
      },
      {
        question: 'Can I accept an exchange instead of cash?',
        answer: 'Yes. Buyers can offer an item or cash plus an item. You decide whether an offer is right for you.',
      },
      {
        question: 'Do I have to accept the first offer?',
        answer: 'No. You can review every offer privately and ask for more information before deciding.',
      },
      {
        question: 'How do I get paid?',
        answer: 'Payment is arranged directly between you and the buyer. Reloop does not process payments or hold funds.',
      },
      {
        question: 'Can I edit or delete a listing?',
        answer: 'Yes. Signed-in owners can update or delete their own listings from the item view.',
      },
    ],
    cta: {
      heading: 'Give a good thing another turn.',
      body: 'Post the details, set your minimum, and let the community respond.',
      primary: { label: 'Browse listings', href: '/#browse' },
      secondary: { label: 'How it works', href: '/how-it-works' },
    },
  },

  exchange: {
    path: '/exchange',
    breadcrumb: 'Exchange',
    title: 'Exchange Goods on Reloop — Cash, Item or Both',
    description: 'Swap pre-loved items with people nearby. On Reloop, buyers can offer cash, another item, or cash plus an item. Learn how exchanges work.',
    eyebrow: 'Exchanging on Reloop',
    heading: 'Exchange what you have for what you need.',
    lede: 'Not every good find needs to be a cash purchase. Reloop lets buyers propose a cash offer, an item exchange, or a mix of both.',
    sections: [
      {
        heading: 'Three ways to make an offer',
        cards: [
          {
            heading: 'Cash',
            body: 'Offer an amount at or above the seller’s minimum cash offer. It is the simplest way to buy a find outright.',
          },
          {
            heading: 'Item',
            body: 'Offer something you already own. Describe it clearly so the seller can decide whether it fits what they need.',
          },
          {
            heading: 'Cash + item',
            body: 'Combine both when the values are close but not quite equal. The seller decides whether the mix works.',
          },
        ],
      },
      {
        heading: 'How an exchange works',
        paragraphs: [
          'Open a listing and choose the offer type. Add the cash amount, a description of the item you are offering, or both, then send a message. The seller reviews the offer privately and can reply to ask for more detail.',
        ],
      },
      {
        heading: 'What makes a fair swap',
        items: [
          'Describe the condition honestly, including marks or faults',
          'Show real photos when the seller asks',
          'Agree on what each item is worth before the handoff',
          'Be clear about what is included',
          'Leave room to walk away if the item is not as described',
        ],
      },
      {
        heading: 'Meet safely',
        paragraphs: [
          'Agree on a public place and a time that works for both people. Inspect the items together before completing the exchange. Reloop does not process payments or guarantee the condition of an item.',
        ],
      },
    ],
    faq: [
      {
        question: 'Do I need cash to use Reloop?',
        answer: 'No. You can offer an item, cash, or a combination of both.',
      },
      {
        question: 'Can I offer more than one item?',
        answer: 'Yes. Describe the item or items you are offering in the offer message so the seller has the full picture.',
      },
      {
        question: 'Who decides whether to accept?',
        answer: 'The seller reviews the offer and decides whether to pursue it. You are not committed until you both agree.',
      },
      {
        question: 'Does Reloop value my item?',
        answer: 'No. Reloop does not provide valuations. The people involved agree on what a fair exchange looks like.',
      },
      {
        question: 'What if the item is not as described?',
        answer: 'Inspect the item before completing the exchange. If it does not match the listing, you can choose not to go ahead.',
      },
    ],
    cta: {
      heading: 'Find a better fit for what you have.',
      body: 'Browse nearby listings, or post something you would be happy to exchange.',
      primary: { label: 'Browse listings', href: '/#browse' },
      secondary: { label: 'Sell an item', href: '/sell' },
    },
  },

  secondhand: {
    path: '/secondhand',
    breadcrumb: 'Secondhand',
    title: 'Secondhand & Pre-Loved Goods Nearby — Reloop',
    description: 'Shop secondhand clothing, home goods, tech and accessories from people nearby. Find unique pre-loved pieces, save favourites and message sellers directly on Reloop.',
    eyebrow: 'Secondhand marketplace',
    heading: 'Secondhand and pre-loved goods, nearby.',
    lede: 'Reloop is a community marketplace for useful things that deserve another turn. Browse local listings across clothing, home, tech and accessories.',
    sections: [
      {
        heading: 'Browse by category',
        cards: [
          {
            heading: 'Clothing',
            body: 'Everyday pieces, outerwear and accessories that deserve another wardrobe.',
          },
          {
            heading: 'Home',
            body: 'Useful objects, decor and small furniture for the place you are making your own.',
          },
          {
            heading: 'Tech',
            body: 'Devices and accessories from people nearby, with the condition described by the seller.',
          },
          {
            heading: 'Accessories',
            body: 'Bags, jewellery, watches and finishing pieces with a history.',
          },
        ],
      },
      {
        heading: 'Why secondhand',
        paragraphs: [
          'Secondhand shopping can be more affordable, more surprising and more sustainable than buying new. It keeps useful items in circulation and gives local sellers a direct way to pass things on.',
        ],
      },
      {
        heading: 'Find what fits',
        paragraphs: [
          'Search by item or place, filter by category, and sort by recency, price or name. Save the finds you want to think about, then message the seller with any questions. The basket keeps your shortlist in one place.',
        ],
      },
      {
        heading: 'Price in the currency that suits you',
        paragraphs: [
          'Listings can be priced in NPR or USD, so members can use the currency that fits their community. Check the currency on each listing before you make an offer.',
        ],
      },
      {
        heading: 'Know what you are getting',
        paragraphs: [
          'Listings include the seller’s description of condition and quality. Ask questions, request more photos and inspect the item before the handoff. Reloop does not arrange delivery or guarantee an item.',
        ],
      },
    ],
    faq: [
      {
        question: 'What counts as pre-loved?',
        answer: 'An item that has been owned before. It may be new with tags, gently used or well loved; the seller describes the condition.',
      },
      {
        question: 'Are all items secondhand?',
        answer: 'Reloop supports new and pre-loved goods. Check each listing’s condition before you decide.',
      },
      {
        question: 'Can I sell instead of buying?',
        answer: 'Yes. You can post an item, set a minimum cash offer and choose whether to consider exchanges.',
      },
      {
        question: 'Does Reloop deliver?',
        answer: 'No. Reloop does not arrange delivery. Members agree on a local handoff directly.',
      },
      {
        question: 'Where is Reloop available?',
        answer: 'Reloop is built for local communities. Listings show the seller’s location or community, and members arrange the handoff themselves.',
      },
    ],
    cta: {
      heading: 'Something useful is probably nearby.',
      body: 'Browse the latest finds, save a few, and start a conversation with the seller.',
      primary: { label: 'Browse secondhand finds', href: '/#browse' },
      secondary: { label: 'How it works', href: '/how-it-works' },
    },
  },

  about: {
    path: '/about',
    breadcrumb: 'About',
    title: 'About Reloop — A Community Marketplace for Pre-Loved Goods',
    description: 'Reloop is a community marketplace for buying, selling and exchanging new and pre-loved goods nearby. Learn what Reloop is, what it is not and how it works.',
    eyebrow: 'About Reloop',
    heading: 'A better place for useful things.',
    lede: 'Reloop connects people who have good things they no longer need with people who can use them. The goal is simple: keep useful items moving through the community.',
    sections: [
      {
        heading: 'What Reloop is',
        paragraphs: [
          'Reloop is a community marketplace for buying, selling and exchanging new and pre-loved goods nearby. Members post listings, browse local finds, save a shortlist and message each other directly. Offers can be cash, another item, or a combination of both.',
        ],
      },
      {
        heading: 'What Reloop is not',
        paragraphs: [
          'Reloop is not a retailer, a payment processor or a delivery service. There is no checkout and no escrow. Members are responsible for their listings, offers and handoffs, and they arrange the details directly.',
        ],
      },
      {
        heading: 'Why we built it',
        paragraphs: [
          'Useful things should not lose their value just because one person is finished with them. Reloop makes it easier to pass things on, find something affordable and keep good items out of the waste stream. Local connections make the exchange more human.',
        ],
      },
      {
        heading: 'How we try to keep it useful',
        items: [
          'Ask for real photos and honest descriptions',
          'Keep offers and conversations clear',
          'Meet in public places and inspect items',
          'Respect the people on the other side of the exchange',
        ],
      },
      {
        heading: 'The name',
        paragraphs: [
          'Reloop is about giving good things another loop: pass them on, exchange them, and keep them in use. Pre-loved, passed on.',
        ],
      },
    ],
    cta: {
      heading: 'Keep something useful in motion.',
      body: 'Browse what is nearby, or post an item you are ready to pass on.',
      primary: { label: 'Browse listings', href: '/#browse' },
      secondary: { label: 'How it works', href: '/how-it-works' },
    },
  },
};

export const PUBLIC_PAGE_KEYS = Object.keys(PUBLIC_PAGES);

export const PUBLIC_PAGE_PATHS = PUBLIC_PAGE_KEYS.map((key) => PUBLIC_PAGES[key].path);

export function getPublicPageKey(pathname) {
  if (typeof pathname !== 'string') return null;
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/') return 'home';
  const key = clean.replace(/^\//, '');
  return Object.prototype.hasOwnProperty.call(PUBLIC_PAGES, key) ? key : null;
}
