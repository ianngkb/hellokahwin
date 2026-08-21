/**
 * One entry per audited entity type: what to call it, where its name lives, and
 * where an admin can go to look at it.
 *
 * Previously this knowledge was smeared across the activity page — a four-line
 * `getEntityLink` covering 4 of the 21 live entity types, and an
 * `ACTION_VARIANTS` map covering 9 of 33 live actions. Everything else rendered
 * as a bare UUID with no link. Centralising it means adding an entity type is
 * one entry here rather than an edit in three files.
 *
 * `table` / `idColumn` / `nameColumn` are raw SQL identifiers rather than
 * Drizzle objects on purpose: resolve-labels.ts stitches them into a single
 * UNION ALL so that labelling a page costs exactly one query no matter how many
 * entity types it holds. See that file for why the fan-out alternative is
 * dangerous here.
 *
 * The 21 types below are the ones that actually exist in prod `audit_logs`.
 * Types with no backing row (`catalog`, `inspire_tag_merge`) are deliberately
 * present but unresolvable — they still need a noun and a link.
 */

export interface AuditEntityDef {
  /** Singular noun shown to the user, e.g. "article". */
  noun: string;
  /** Physical table holding the entity, or null when it has no backing row. */
  table: string | null;
  /** Primary-key column. */
  idColumn: string;
  /**
   * Storage type of `idColumn`. Drives how resolve-labels.ts binds the id list:
   * a uuid column must be compared against uuid literals, because casting the
   * COLUMN (`id::text IN (…)`) makes the primary-key index unusable and turns
   * label resolution into a sequential scan of `articles`. Defaults to 'uuid';
   * only `vendors` stores a text id (it mirrors the Clerk/profile id).
   */
  idType?: 'uuid' | 'text';
  /**
   * SQL expression producing the display name. May be a plain column or a
   * concatenation — it is embedded verbatim, so keep it a literal from this
   * file and never interpolate user input into it.
   */
  nameExpr: string;
  /** Builds an admin URL for the entity, or null when there's nowhere to go. */
  href: ((id: string) => string) | null;
}

export const AUDIT_ENTITIES: Record<string, AuditEntityDef> = {
  article: {
    noun: 'article',
    table: 'articles',
    idColumn: 'id',
    nameExpr: 'title',
    href: (id) => `/admin/inspire/${id}/edit`,
  },
  listing: {
    noun: 'listing',
    table: 'listings',
    idColumn: 'id',
    nameExpr: 'name',
    href: (id) => `/admin/listings/${id}/manage`,
  },
  vendor: {
    noun: 'vendor',
    table: 'vendors',
    idColumn: 'id',
    idType: 'text',
    nameExpr: 'business_name',
    href: (id) => `/admin/vendors/${id}/edit`,
  },
  venue_recommendations: {
    noun: 'recommendation',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/recommendations',
  },
  checklist_task_template: {
    noun: 'checklist template',
    table: 'checklist_task_templates',
    idColumn: 'id',
    nameExpr: 'title',
    href: () => '/admin/checklist',
  },
  banner: {
    noun: 'banner',
    table: 'banners',
    idColumn: 'id',
    nameExpr: 'name',
    href: () => '/admin/advertisements',
  },
  ad_group: {
    noun: 'ad group',
    table: 'ad_groups',
    idColumn: 'id',
    nameExpr: 'name',
    href: () => '/admin/advertisements',
  },
  ad_group_banner: {
    noun: 'ad placement',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/advertisements',
  },
  inspire_tag: {
    noun: 'tag',
    table: 'inspire_tags',
    idColumn: 'id',
    nameExpr: 'name',
    href: () => '/admin/inspire/tags',
  },
  inspire_tag_merge: {
    noun: 'tag merge',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/inspire/tags',
  },
  inspire_nav_item: {
    noun: 'nav item',
    table: 'inspire_nav_items',
    idColumn: 'id',
    nameExpr: 'label',
    href: () => '/admin/inspire/navigation',
  },
  redirect: {
    noun: 'redirect',
    table: 'redirects',
    idColumn: 'id',
    nameExpr: 'source_path',
    href: () => '/admin/redirects',
  },
  vendor_member: {
    noun: 'team member',
    table: 'vendor_members',
    idColumn: 'id',
    nameExpr: 'email',
    href: null,
  },
  vendor_join_request: {
    noun: 'join request',
    table: 'vendor_join_requests',
    idColumn: 'id',
    nameExpr: 'business_name_text',
    href: () => '/admin/vendors/join-requests',
  },
  vendor_pending_signup: {
    noun: 'pending signup',
    table: 'vendor_pending_signup',
    idColumn: 'id',
    nameExpr: 'COALESCE(business_name, email)',
    // The vendor-onboarding admin page was removed once the Clerk migration
    // finished; historical audit rows keep rendering, just without a link.
    href: null,
  },
  lead: {
    noun: 'lead',
    table: 'leads',
    idColumn: 'id',
    nameExpr: 'name',
    href: () => '/admin/leads',
  },
  venue_lead: {
    noun: 'venue lead',
    table: 'venue_leads',
    idColumn: 'id',
    nameExpr: 'name',
    href: null,
  },
  admin_user: {
    noun: 'admin user',
    table: 'admin_users',
    idColumn: 'id',
    nameExpr: 'email',
    href: () => '/admin/roles-users',
  },
  admin_role: {
    noun: 'admin role',
    table: 'admin_roles',
    idColumn: 'id',
    nameExpr: 'name',
    href: () => '/admin/roles-users',
  },
  task_board: {
    noun: 'task board',
    table: 'task_boards',
    idColumn: 'id',
    nameExpr: 'name',
    href: () => '/admin/tasks',
  },
  couple: {
    noun: 'couple',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: (id) => `/admin/couples/${id}`,
  },
  crm_deal: {
    noun: 'deal',
    table: 'crm_deals',
    idColumn: 'id',
    nameExpr: 'title',
    href: (id) => `/admin/war-room/sales/deals/${id}`,
  },
  // Non-UUID entity ids — these only became storable in migration 0137.
  catalog: {
    noun: 'catalog order',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/vendors/catalog-order',
  },
  analytics: {
    noun: 'analytics data',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/settings',
  },
  email_template: {
    noun: 'email template',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/email-templates',
  },
  bug: {
    noun: 'bug',
    table: 'bugs',
    idColumn: 'id',
    nameExpr: 'title',
    href: (id) => `/admin/bugs/${id}`,
  },
  inquiry: {
    noun: 'inquiry',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: (id) => `/admin/inquiries/${id}`,
  },
  wedding_submission: {
    noun: 'wedding submission',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: (id) => `/admin/wedding-submissions/${id}`,
  },
  media: {
    noun: 'media item',
    table: 'media',
    idColumn: 'id',
    nameExpr: "COALESCE(NULLIF(alt, ''), filename)",
    href: () => '/admin/inspire/media',
  },
  photo: {
    noun: 'photo',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/photos',
  },
  page_404_override: {
    noun: '404 URL',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/404-events',
  },
  space_setting_option: {
    noun: 'vendor setting',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/vendor-settings',
  },
  auto_link_rule: {
    noun: 'auto-link rule',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/internal-links',
  },
  target_keyword: {
    noun: 'target keyword',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/internal-links',
  },
  link_suggestion: {
    noun: 'link suggestion',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/internal-links',
  },
  article_link: {
    noun: 'article link',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/internal-links',
  },
  // Non-resolvable on purpose: a mastersheet row has no human-facing name of its
  // own (it borrows the listing's), so there is nothing useful to look up. The
  // link goes to the sheet itself.
  mastersheet_row: {
    noun: 'mastersheet row',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/mastersheet',
  },
  crm_activity: {
    noun: 'CRM activity',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/war-room/sales/activities',
  },
  crm_onboarding_stage: {
    noun: 'onboarding stage',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/war-room/sales/onboarding',
  },
  crm_onboarding_task_template: {
    noun: 'onboarding template',
    table: null,
    idColumn: 'id',
    nameExpr: '',
    href: () => '/admin/war-room/sales/onboarding',
  },
};

/** Falls back to a humanised version of the raw type for unregistered entities. */
export function entityNoun(entityType: string): string {
  return AUDIT_ENTITIES[entityType]?.noun ?? entityType.replace(/_/g, ' ');
}

export function entityHref(entityType: string, entityId: string): string | null {
  return AUDIT_ENTITIES[entityType]?.href?.(entityId) ?? null;
}

/** Entity types whose names can be looked up in a table. */
export function resolvableEntityTypes(): string[] {
  return Object.entries(AUDIT_ENTITIES)
    .filter(([, def]) => def.table && def.nameExpr)
    .map(([type]) => type);
}

/**
 * Whether a live lookup can say anything about this entity type.
 *
 * Callers MUST consult this before concluding an entity was deleted. Roughly
 * half the registry has no backing table (`analytics`, `inquiry`,
 * `auto_link_rule`, …), so for those a missing lookup result means "never
 * looked", not "gone" — treating the two the same marks live entities as
 * deleted and strips their links.
 */
export function isResolvableEntityType(entityType: string): boolean {
  const def = AUDIT_ENTITIES[entityType];
  return Boolean(def?.table && def.nameExpr);
}
