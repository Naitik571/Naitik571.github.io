/* ============================================================
   CONTENT — the only file you need to edit.

   Everything marked PLACEHOLDER is a stand-in. Real numbers,
   links and copy go here; nothing else in the site hardcodes text.
   ============================================================ */

export const CONTENT = {
  name: 'Naitik',
  role: 'Design Engineer',
  location: 'Delhi-NCR',
  availability: 'Open to work',

  bio: `Design engineer, 18, on a gap year. I build computer vision, shaders and
local models — small tools that do one thing properly.`,

  email: 'naitikvarshney571@gmail.com',

  links: [
    { label: 'GitHub',   href: 'https://github.com/Naitik571' },
    { label: 'Email',    href: 'mailto:naitikvarshney571@gmail.com' }
  ],

  /* ---------------------------------------------------------- projects */
  projects: [
    {
      slug:  'itsgiving',
      name:  'itsgiving',
      desc:  'Face-tracked meme camera that publishes to a virtual webcam',
      year:  '2026',
      tags:  ['Python', 'MediaPipe', 'OpenCV'],
      card:  './assets/img/card-1.webp',
      chip:  '478 landmarks',
      href:  './work/itsgiving/'
    }
  ],

  /* ------------------------------------------------------------ status */
  status: {
    portrait: './assets/img/p3r-portrait.png',
    note: `Self-taught, working alone, mostly at night. I'd rather ship one
small thing that works than plan a big one that doesn't.`,
    /* grade A–E, drawn as a radar */
    stats: [
      { key: 'Vision',   grade: 'A' },
      { key: 'Shaders',  grade: 'B' },
      { key: 'Systems',  grade: 'B' },
      { key: 'Motion',   grade: 'A' },
      { key: 'Models',   grade: 'C' },
      { key: 'Shipping', grade: 'B' }
    ],
    rows: [
      ['Based',   'Delhi-NCR'],
      ['State',   'Open to work'],
      ['Now',     'One project, shipping'],
      ['Tools',   'Python · MediaPipe · OpenCV']
    ]
  }
};
