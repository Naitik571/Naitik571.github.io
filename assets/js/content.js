/* ============================================================
   CONTENT — the only file you need to edit.
   Strings marked REPLACE are placeholders.
   ============================================================ */

export const CONTENT = {
  name: 'Naitik',                 // REPLACE
  role: 'Design Engineer',        // REPLACE
  location: 'India',              // REPLACE
  availability: 'Open to work',

  bio: `Design engineer, 18, on a gap year. I build computer vision, shaders and
local models — small tools that do one thing properly.`,

  /* the three cards, top to bottom on the title screen */
  projects: [
    {
      name: 'itsgiving',
      desc: 'Face-tracked meme camera that publishes to a virtual webcam',
      year: '2026',
      tags: ['Python', 'MediaPipe', 'OpenCV'],
      href: '#'                        // REPLACE: repo (private for now)
    },
    {
      name: 'Aurora Core',
      desc: 'Procedural plasma sphere, everything generated in-shader',
      year: '2025',
      tags: ['Three.js', 'GLSL'],
      href: '#'
    },
    {
      name: 'Sol',
      desc: 'Solar-system explorer with a real camera rig',
      year: '2025',
      tags: ['Three.js', 'WebGL'],
      href: '#'
    }
  ]
};
