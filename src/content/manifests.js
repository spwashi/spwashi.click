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
    hero_tagline_slot: '^identity[spwashi]{ physics:spw role:internet-persona medium:web-language }',
    hero_subline_slot: '^state-model[scene]{ seed>pulse>counterpoint>chorus loop:click->phase }',
    intro_body_slot: '^profile[spw-workbench]{ function:language-kernel claim:executable-copy demo:spwashi.click }',
    contact_cta_slot: '!contact[primary]{ channel:bookings+collabs mode:runtime-open }'
  }),
  selectedWork: Object.freeze([
    Object.freeze({
      title_slot: '^demo[facet_nav]{ id:drop_01 }',
      summary_slot: '~summary[workbench]{ module:syntax-lab signal:brace+operator navigation:facet-graph }',
      href: '/work/#project-one'
    }),
    Object.freeze({
      title_slot: '^demo[runtime_control]{ id:editorial_02 }',
      summary_slot: '~summary[control]{ api:evalSpw+setTopLevel+setRegion+setWindowVars action:llm-tunable }',
      href: '/work/#project-two'
    }),
    Object.freeze({
      title_slot: '^demo[texture_tuner]{ id:performance_03 }',
      summary_slot: '~summary[pwa]{ shader-field+sw cache:release-arc-vibe source:tealstripesvibes.com }',
      href: '/work/#project-three'
    })
  ]),
  chapters: Object.freeze([
    Object.freeze({
      chapter: 'identity',
      heading: '^module[physics]{ source:spw }',
      body: '~body[kernel]{ seed:spw-workbench output:interaction-grammar }',
      unlockAt: 'seed'
    }),
    Object.freeze({
      chapter: 'systems',
      heading: '^module[disposition]{ vectors:operators }',
      body: '~body[systems]{ braces:layout-view operators:component-view route:combinatoric }',
      unlockAt: 'pulse'
    }),
    Object.freeze({
      chapter: 'improv',
      heading: '^module[geometry]{ medium:facet-nav }',
      body: '~body[improv]{ click->state->lighting result:learnable-abstraction }',
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
