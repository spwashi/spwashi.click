export {
  SITE_MANIFEST,
  HOME_MANIFEST,
  WORK_MANIFEST,
  NOTES_MANIFEST
} from './manifests.js';
export { SPW_FEATURE_CATALOG, summarizeFeatureCatalog } from './feature-catalog.js';

import { HOME_MANIFEST, NOTES_MANIFEST, WORK_MANIFEST } from './manifests.js';

export const CONTENT_MANIFESTS = Object.freeze({
  home: HOME_MANIFEST,
  work: WORK_MANIFEST,
  notes: NOTES_MANIFEST
});
