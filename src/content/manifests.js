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
    hero_tagline_slot: '^identity{ role:web-language system:interactive-runtime }',
    hero_subline_slot: '^phase{ seed>pulse>counterpoint>chorus via:taps }',
    intro_body_slot: '^workbench{ parser+runtime+components aligned:mobile-first }',
    contact_cta_slot: '!contact{ hello@spwashi.click }'
  }),
  selectedWork: Object.freeze([
    Object.freeze({
      title_slot: '^demo{ syntax-lab }',
      summary_slot: '~summary{ brace+operator navigation in one view }',
      href: '/work/#project-one'
    }),
    Object.freeze({
      title_slot: '^demo{ runtime-control }',
      summary_slot: '~summary{ composable runtime api with host-safe controls }',
      href: '/work/#project-two'
    }),
    Object.freeze({
      title_slot: '^demo{ shader+pwa }',
      summary_slot: '~summary{ canvas interaction + release-aware caching }',
      href: '/work/#project-three'
    })
  ]),
  chapters: Object.freeze([
    Object.freeze({
      chapter: 'identity',
      heading: '^module{ physics }',
      body: '~body{ spw grammar + runtime baseline }',
      unlockAt: 'seed'
    }),
    Object.freeze({
      chapter: 'systems',
      heading: '^module{ systems }',
      body: '~body{ route + state + host compatibility }',
      unlockAt: 'pulse'
    }),
    Object.freeze({
      chapter: 'improv',
      heading: '^module{ improv }',
      body: '~body{ interaction tuning + responsive lighting }',
      unlockAt: 'counterpoint'
    })
  ])
});

export const WORK_MANIFEST = Object.freeze({
  metaTitle: 'spwashi.click / collections',
  slots: Object.freeze({
    page_title_slot: 'Collections',
    page_intro_slot: '^curation[spw]{ source:workbench theme:fashion+systems mode:web-language }'
  }),
  projects: Object.freeze([
    Object.freeze({
      id: 'project-one',
      title_slot: '^project[capsule_01]{ type:language-ui }',
      role_slot: '^role[creative-direction]{ scope:signal-system }',
      summary_slot: '~summary[demo]{ braces-as-navigation operators-as-lenses component-ecology-live }',
      metrics_slot: '%metric[response]{ memory:high dwell:deep }'
    }),
    Object.freeze({
      id: 'project-two',
      title_slot: '^project[editorial_02]{ type:runtime-literature }',
      role_slot: '^role[narrative-direction]{ scope:reader+llm }',
      summary_slot: '~summary[runtime]{ controls:evalSpw+reset+rebind parameters:top-level+region+window-vars }',
      metrics_slot: '%metric[reach]{ channels:notes+work expansion:lore-land-ready }'
    }),
    Object.freeze({
      id: 'project-three',
      title_slot: '^project[performance_03]{ type:texture-loop }',
      role_slot: '^role[performer]{ scope:interaction-style-fusion }',
      summary_slot: '~summary[pwa]{ shader:canvas-harmonics service-worker:release-cache cadence:arc+vibe }',
      metrics_slot: '%metric[response]{ refresh:regular quality:stable }'
    })
  ])
});

export const NOTES_MANIFEST = Object.freeze({
  metaTitle: 'spwashi.click / notes',
  slots: Object.freeze({
    page_title_slot: 'Notes',
    page_intro_slot: '^notes[spwlang]{ tags:interaction-literacy+component-ecology+software-literature }'
  }),
  notes: Object.freeze([
    Object.freeze({
      id: 'note-state-machines',
      title_slot: '^note[state_composition]{ lens:click-phase-machine }',
      excerpt_slot: '~excerpt[interaction]{ deterministic-transitions teach-intuition through repeatable novelty }',
      date_slot: 'SLOT: YYYY-MM-DD'
    }),
    Object.freeze({
      id: 'note-motion-ethics',
      title_slot: '^note[motion_presence]{ lens:tempo+accessibility }',
      excerpt_slot: '~excerpt[motion]{ reduced-motion parity and lighting discipline keep meaning readable }',
      date_slot: 'SLOT: YYYY-MM-DD'
    }),
    Object.freeze({
      id: 'note-rhythm-api',
      title_slot: '^note[rhythm_signature]{ lens:api+cadence }',
      excerpt_slot: '~excerpt[language]{ braces/operators become navigation operators and cognitive scaffolds }',
      date_slot: 'SLOT: YYYY-MM-DD'
    })
  ])
});
