/**
 * Intent:
 * Hold authored content in plain objects so page modules stay focused on composition, not copywriting.
 * Invariants:
 * Slot keys are stable IDs referenced by data-slot attributes in HTML templates.
 * How this composes with neighbors:
 * Page initializers consume these manifests and hydrate placeholder slots consistently.
 */

export const SITE_MANIFEST = Object.freeze({
  siteName: 'spwashi.click',
  baseTitle: 'spwashi.click',
  footer: {
    contactHref: 'mailto:hello@spwashi.click',
    contactLabel: 'hello@spwashi.click',
    imprint: '^[system]{ mode: web-components profile: spwashi lang: spw }',
    sisterSiteHref: 'https://tealstripesvibes.com',
    sisterSiteLabel: 'tealstripesvibes.com'
  },
  identity: {
    personaName: 'Spwashi',
    domain: 'internet-persona',
    narrative: '^[physics]{ spw } ^[formation]{ geometry+disposition }'
  }
});

export const HOME_MANIFEST = Object.freeze({
  metaTitle: 'spwashi.click',
  slots: Object.freeze({
    hero_title: 'Spwashi',
    hero_tagline_slot: '^[identity]{ name: spwashi physics: spw surface: web }',
    hero_subline_slot: '^[state-model]{ seed>pulse>counterpoint>chorus ui: language }',
    intro_body_slot: '^[profile-slot]{ ~summary: replace }',
    contact_cta_slot: '![contact]{ channel: bookings+collabs }'
  }),
  selectedWork: Object.freeze([
    Object.freeze({
      title_slot: '^[item]{ id: drop_01 }',
      summary_slot: '~summary{ replace }',
      href: '/work/#project-one'
    }),
    Object.freeze({
      title_slot: '^[item]{ id: editorial_02 }',
      summary_slot: '~summary{ replace }',
      href: '/work/#project-two'
    }),
    Object.freeze({
      title_slot: '^[item]{ id: performance_03 }',
      summary_slot: '~summary{ replace }',
      href: '/work/#project-three'
    })
  ]),
  chapters: Object.freeze([
    Object.freeze({
      chapter: 'identity',
      heading: '^[module]{ physics }',
      body: '~body{ replace_existence_frame }',
      unlockAt: 'seed'
    }),
    Object.freeze({
      chapter: 'systems',
      heading: '^[module]{ disposition }',
      body: '~body{ replace_disposition_vectors }',
      unlockAt: 'pulse'
    }),
    Object.freeze({
      chapter: 'improv',
      heading: '^[module]{ geometry }',
      body: '~body{ replace_combinatoric_crystal_model }',
      unlockAt: 'counterpoint'
    })
  ])
});

export const WORK_MANIFEST = Object.freeze({
  metaTitle: 'spwashi.click / collections',
  slots: Object.freeze({
    page_title_slot: 'Collections',
    page_intro_slot: '^[curation]{ rule: replace }'
  }),
  projects: Object.freeze([
    Object.freeze({
      id: 'project-one',
      title_slot: '^[project]{ id: capsule_01 }',
      role_slot: '^[role]{ creative-direction }',
      summary_slot: '~summary{ visual-language-established }',
      metrics_slot: '%metric{ engagement }'
    }),
    Object.freeze({
      id: 'project-two',
      title_slot: '^[project]{ id: editorial_02 }',
      role_slot: '^[role]{ narrative-direction }',
      summary_slot: '~summary{ movement+lighting+posture }',
      metrics_slot: '%metric{ reach }'
    }),
    Object.freeze({
      id: 'project-three',
      title_slot: '^[project]{ id: performance_03 }',
      role_slot: '^[role]{ performer }',
      summary_slot: '~summary{ interaction+style fusion }',
      metrics_slot: '%metric{ response }'
    })
  ])
});

export const NOTES_MANIFEST = Object.freeze({
  metaTitle: 'spwashi.click / notes',
  slots: Object.freeze({
    page_title_slot: 'Notes',
    page_intro_slot: '^[notes]{ tags: replace }'
  }),
  notes: Object.freeze([
    Object.freeze({
      id: 'note-state-machines',
      title_slot: '^[note]{ id: state_composition }',
      excerpt_slot: '~excerpt{ transition-logic + audience-expectation }',
      date_slot: 'SLOT: YYYY-MM-DD'
    }),
    Object.freeze({
      id: 'note-motion-ethics',
      title_slot: '^[note]{ id: motion_presence }',
      excerpt_slot: '~excerpt{ motion-legibility in static+dynamic }',
      date_slot: 'SLOT: YYYY-MM-DD'
    }),
    Object.freeze({
      id: 'note-rhythm-api',
      title_slot: '^[note]{ id: rhythm_signature }',
      excerpt_slot: '~excerpt{ cadence+geometry as identity-signal }',
      date_slot: 'SLOT: YYYY-MM-DD'
    })
  ])
});
