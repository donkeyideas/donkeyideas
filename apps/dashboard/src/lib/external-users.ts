import { Pool } from 'pg';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { prisma } from '@donkey-ideas/database';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NormalizedUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  lastActive: string | null;
  status: string;
  role: string;
  avatarUrl: string | null;
  provider: 'google' | 'apple' | 'email' | 'device';
  plan: string;           // subscription plan/tier (e.g. 'free', 'pro', 'premium')
  project: string;       // slug
  projectName: string;   // display name
  projectColor: string;
  projectLogo?: string | null;
}

export interface ProjectOverview {
  slug: string;
  displayName: string;
  color: string;
  logo?: string | null;
  total: number;
  new30d: number;
  new7d: number;
  error?: string;
}

export interface GrowthDataPoint {
  date: string;
  [projectSlug: string]: string | number; // dynamic keys per project
}

// ─── Project Configs ─────────────────────────────────────────────────────────

type ConnectionType = 'pg' | 'prisma' | 'supabase-auth' | 'supabase-table';

interface ProjectConfig {
  slug: string;
  displayName: string;
  companyNameMatch: string; // matches Company.name in Donkey Ideas DB for logo lookup
  color: string;
  connectionType: ConnectionType;
  // For 'pg' connections
  envDbUrl?: string;
  tableName?: string;
  fields?: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    lastActive: string | null;
    status: string;
    role: string;
    avatarUrl: string | null;
    provider: string; // SQL expression for auth provider
    plan?: string;    // SQL expression for subscription plan/tier
  };
  excludeBotsSql?: string; // WHERE clause fragment to exclude bots (e.g. 'AND is_ai IS NOT TRUE')
  // For 'supabase-auth' and 'supabase-table' connections
  envSupabaseUrl?: string;
  envSupabaseKey?: string;
  supabaseTable?: string; // for 'supabase-table' type
  hasBotProfiles?: boolean; // if true, filter bots from profiles table (CFB Social)
  // Custom field mappings for supabase-table (defaults: id, email, full_name, created_at, last_login)
  supabaseFields?: {
    id?: string;
    email?: string;
    name?: string;
    createdAt?: string;
    lastActive?: string | null;
    status?: string | null;
    role?: string | null;
    avatarUrl?: string | null;
    selectExtra?: string; // extra columns to select
  };
  supabaseBotColumn?: string; // column name for bot flag filter (e.g. 'isBot')
}

const PROJECT_CONFIGS: ProjectConfig[] = [
  {
    slug: 'argufight',
    displayName: 'ArguFight',
    companyNameMatch: 'Argu Fight',
    color: '#8B5CF6', // purple
    connectionType: 'pg',
    envDbUrl: 'ARGUFIGHT_DB_URL',
    tableName: 'users',
    excludeBotsSql: 'AND is_ai IS NOT TRUE',
    fields: {
      id: 'id',
      email: 'email',
      name: 'username',
      createdAt: 'created_at',
      lastActive: 'updated_at',
      status: `CASE WHEN is_banned = true THEN 'banned' ELSE 'active' END`,
      role: `CASE WHEN is_admin = true THEN 'admin' WHEN is_creator = true THEN 'creator' ELSE 'user' END`,
      avatarUrl: 'avatar_url',
      provider: `CASE WHEN google_auth_enabled = true THEN 'google' WHEN apple_auth_enabled = true THEN 'apple' ELSE 'email' END`,
      plan: `COALESCE((SELECT us.tier FROM user_subscriptions us WHERE us.user_id = users.id AND us.status = 'ACTIVE' LIMIT 1), 'FREE')`,
    },
  },
  {
    slug: 'basketball',
    displayName: 'Basketball',
    companyNameMatch: 'Basktball',
    color: '#F59E0B', // amber
    connectionType: 'supabase-table',
    envSupabaseUrl: 'BASKETBALL_SUPABASE_URL',
    envSupabaseKey: 'BASKETBALL_SUPABASE_KEY',
    supabaseTable: 'User',
    supabaseBotColumn: 'isBot',
    supabaseFields: {
      id: 'id',
      email: 'email',
      name: 'displayName',
      createdAt: 'createdAt',
      lastActive: 'lastActiveAt',
      status: 'status',
      role: 'role',
      avatarUrl: 'avatarUrl',
      selectExtra: 'id, email, displayName, name, createdAt, lastActiveAt, status, role, avatarUrl, isBot',
    },
  },
  {
    slug: 'opticrank',
    displayName: 'OpticRank',
    companyNameMatch: 'Optic Rank',
    color: '#10B981', // emerald
    connectionType: 'supabase-auth',
    envSupabaseUrl: 'OPTICRANK_SUPABASE_URL',
    envSupabaseKey: 'OPTICRANK_SUPABASE_KEY',
  },
  {
    slug: 'construction',
    displayName: 'Construction ERP',
    companyNameMatch: 'Buildwrk',
    color: '#EF4444', // red
    connectionType: 'supabase-auth',
    envSupabaseUrl: 'CONSTRUCTION_SUPABASE_URL',
    envSupabaseKey: 'CONSTRUCTION_SUPABASE_KEY',
  },
  {
    slug: 'cfbsocial',
    displayName: 'CFB Social',
    companyNameMatch: 'CFB Social',
    color: '#3B82F6', // blue
    connectionType: 'supabase-auth',
    envSupabaseUrl: 'CFBSOCIAL_SUPABASE_URL',
    envSupabaseKey: 'CFBSOCIAL_SUPABASE_KEY',
    hasBotProfiles: true,
  },
  {
    slug: 'julyu',
    displayName: 'Julyu',
    companyNameMatch: 'Julyu',
    color: '#EC4899', // pink
    connectionType: 'supabase-table',
    envSupabaseUrl: 'JULYU_SUPABASE_URL',
    envSupabaseKey: 'JULYU_SUPABASE_KEY',
    supabaseTable: 'users',
  },
  {
    slug: 'govirall',
    displayName: 'Go Virall',
    companyNameMatch: 'Go Virall',
    color: '#06B6D4', // cyan
    connectionType: 'supabase-auth',
    envSupabaseUrl: 'GOVIRALL_SUPABASE_URL',
    envSupabaseKey: 'GOVIRALL_SUPABASE_KEY',
  },
  {
    slug: 'topviso',
    displayName: 'Top Viso',
    companyNameMatch: 'Top Viso',
    color: '#6366F1', // indigo
    connectionType: 'supabase-auth',
    envSupabaseUrl: 'TOPVISO_SUPABASE_URL',
    envSupabaseKey: 'TOPVISO_SUPABASE_KEY',
  },
  {
    slug: 'coasterracing',
    displayName: 'DRCR',
    companyNameMatch: 'Donkey Roller Coaster Racing',
    color: '#F97316', // orange
    connectionType: 'prisma',
    tableName: 'game_players',
    fields: {
      id: 'id',
      email: "COALESCE(email, 'device:' || \"deviceId\")",
      name: '"playerName"',
      createdAt: '"createdAt"',
      lastActive: '"lastActiveAt"',
      status: 'status',
      role: "'player'",
      avatarUrl: 'NULL',
      provider: "'device'",
      plan: '"passTier"',
    },
  },
  {
    slug: 'jetdale',
    displayName: 'Jetdale',
    companyNameMatch: 'Jetdale',
    color: '#14B8A6', // teal
    connectionType: 'supabase-auth',
    envSupabaseUrl: 'JETDALE_SUPABASE_URL',
    envSupabaseKey: 'JETDALE_SUPABASE_KEY',
  },
];

export function getProjectConfigs() {
  return PROJECT_CONFIGS;
}

// ─── Connection Pools (cached) ───────────────────────────────────────────────

const pgPools: Record<string, Pool> = {};
const supabaseClients: Record<string, SupabaseClient> = {};

function getPgPool(config: ProjectConfig): Pool | null {
  const dbUrl = process.env[config.envDbUrl!];
  if (!dbUrl) return null;

  if (!pgPools[config.slug]) {
    pgPools[config.slug] = new Pool({
      connectionString: dbUrl,
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pgPools[config.slug];
}

function getSupabaseClient(config: ProjectConfig): SupabaseClient | null {
  const url = process.env[config.envSupabaseUrl!];
  const key = process.env[config.envSupabaseKey!];
  if (!url || !key) return null;

  if (!supabaseClients[config.slug]) {
    supabaseClients[config.slug] = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseClients[config.slug];
}

// ─── Query Functions ─────────────────────────────────────────────────────────

async function fetchPgUserCount(config: ProjectConfig): Promise<{ total: number; new30d: number; new7d: number }> {
  const pool = getPgPool(config);
  if (!pool) throw new Error(`No DB URL configured for ${config.displayName}`);

  const { fields, tableName, excludeBotsSql } = config;
  const createdAt = fields!.createdAt;
  const botFilter = excludeBotsSql || '';

  const result = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE ${createdAt} >= NOW() - INTERVAL '30 days') as new_30d,
      COUNT(*) FILTER (WHERE ${createdAt} >= NOW() - INTERVAL '7 days') as new_7d
    FROM ${tableName}
    WHERE 1=1 ${botFilter}
  `);

  return {
    total: parseInt(result.rows[0].total),
    new30d: parseInt(result.rows[0].new_30d),
    new7d: parseInt(result.rows[0].new_7d),
  };
}

// ─── Prisma-based queries (same DB as main app) ────────────────────────────

async function fetchPrismaUserCount(config: ProjectConfig): Promise<{ total: number; new30d: number; new7d: number }> {
  const { fields, tableName } = config;
  const createdAt = fields!.createdAt;
  const result: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE ${createdAt} >= NOW() - INTERVAL '30 days') as new_30d,
      COUNT(*) FILTER (WHERE ${createdAt} >= NOW() - INTERVAL '7 days') as new_7d
    FROM "${tableName}"
  `);
  return {
    total: Number(result[0].total),
    new30d: Number(result[0].new_30d),
    new7d: Number(result[0].new_7d),
  };
}

async function fetchPrismaUsers(config: ProjectConfig, options: FetchUsersOptions): Promise<{ users: NormalizedUser[]; total: number }> {
  const { fields, tableName } = config;
  const { page = 1, limit = 25, sortBy = 'createdAt', sortDir = 'desc', search, dateFrom, dateTo } = options;
  const offset = (page - 1) * limit;

  const sortMap: Record<string, string> = {
    name: fields!.name,
    email: fields!.email,
    createdAt: fields!.createdAt,
    lastActive: fields!.lastActive || fields!.createdAt,
    status: fields!.status,
  };
  const orderCol = sortMap[sortBy] || fields!.createdAt;

  const conditions: string[] = [];
  if (search) {
    const escaped = search.replace(/'/g, "''");
    conditions.push(`(${fields!.email} ILIKE '%${escaped}%' OR (${fields!.name})::text ILIKE '%${escaped}%')`);
  }
  if (dateFrom) conditions.push(`${fields!.createdAt} >= '${dateFrom}'::timestamp`);
  if (dateTo) conditions.push(`${fields!.createdAt} <= '${dateTo}'::timestamp`);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM "${tableName}" ${whereClause}`);
  const total = Number(countResult[0].count);

  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      ${fields!.id} AS id,
      ${fields!.email} AS email,
      (${fields!.name})::text AS name,
      ${fields!.createdAt} AS "createdAt",
      ${fields!.lastActive || 'NULL'} AS "lastActive",
      (${fields!.status})::text AS status,
      (${fields!.role})::text AS role,
      ${fields!.avatarUrl || 'NULL'} AS "avatarUrl",
      (${fields!.provider})::text AS provider,
      (${fields!.plan || "'free'"})::text AS plan
    FROM "${tableName}"
    ${whereClause}
    ORDER BY ${orderCol} ${sortDir.toUpperCase()}
    LIMIT ${limit} OFFSET ${offset}
  `);

  return {
    users: rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.createdAt?.toISOString?.() || row.createdAt,
      lastActive: row.lastActive?.toISOString?.() || row.lastActive,
      status: row.status || 'active',
      role: row.role || 'user',
      avatarUrl: row.avatarUrl,
      provider: (row.provider === 'google' || row.provider === 'apple' || row.provider === 'device') ? row.provider : 'email',
      plan: row.plan || 'free',
      project: config.slug,
      projectName: config.displayName,
      projectColor: config.color,
    })),
    total,
  };
}

async function fetchPrismaGrowthData(config: ProjectConfig, days: number): Promise<{ date: string; count: number }[]> {
  const { fields, tableName } = config;
  const createdAt = fields!.createdAt;
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      DATE(${createdAt}) as date,
      COUNT(*) as count
    FROM "${tableName}"
    WHERE ${createdAt} >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(${createdAt})
    ORDER BY date
  `);
  return rows.map(r => ({
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
    count: Number(r.count),
  }));
}

async function fetchBotUserIds(client: SupabaseClient): Promise<Set<string>> {
  const botIds = new Set<string>();
  const { data, error } = await client.from('profiles').select('id').eq('is_bot', true);
  if (!error && data) {
    for (const row of data) botIds.add(row.id);
  }
  return botIds;
}

async function fetchSupabaseAuthUserCount(config: ProjectConfig): Promise<{ total: number; new30d: number; new7d: number }> {
  const client = getSupabaseClient(config);
  if (!client) throw new Error(`No Supabase credentials for ${config.displayName}`);

  // If this project has bot profiles, fetch bot IDs to exclude
  const botIds = config.hasBotProfiles ? await fetchBotUserIds(client) : new Set<string>();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let total = 0;
  let new30d = 0;
  let new7d = 0;
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data: { users }, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    if (!users || users.length === 0) break;

    for (const user of users) {
      if (botIds.has(user.id)) continue; // Skip bots
      total++;
      const created = new Date(user.created_at);
      if (created >= thirtyDaysAgo) new30d++;
      if (created >= sevenDaysAgo) new7d++;
    }

    if (users.length < perPage) break;
    page++;
  }

  return { total, new30d, new7d };
}

async function fetchSupabaseTableUserCount(config: ProjectConfig): Promise<{ total: number; new30d: number; new7d: number }> {
  const client = getSupabaseClient(config);
  if (!client) throw new Error(`No Supabase credentials for ${config.displayName}`);

  const table = config.supabaseTable!;
  const createdAtCol = config.supabaseFields?.createdAt || 'created_at';
  const botCol = config.supabaseBotColumn;

  let baseQuery = () => {
    let q = client.from(table).select('*', { count: 'exact', head: true });
    if (botCol) q = q.neq(botCol, true);
    return q;
  };

  const { count: total } = await baseQuery();

  const now = new Date();
  const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: new30d } = await baseQuery().gte(createdAtCol, thirtyDaysAgoStr);
  const { count: new7d } = await baseQuery().gte(createdAtCol, sevenDaysAgo);

  return { total: total || 0, new30d: new30d || 0, new7d: new7d || 0 };
}

// ─── Fetch Users (list) ─────────────────────────────────────────────────────

interface FetchUsersOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

async function fetchPgUsers(config: ProjectConfig, options: FetchUsersOptions): Promise<{ users: NormalizedUser[]; total: number }> {
  const pool = getPgPool(config);
  if (!pool) throw new Error(`No DB URL for ${config.displayName}`);

  const { fields, tableName, excludeBotsSql } = config;
  const { page = 1, limit = 25, sortBy = 'createdAt', sortDir = 'desc', search, dateFrom, dateTo } = options;
  const offset = (page - 1) * limit;
  const botFilter = excludeBotsSql || '';

  // Map sort field to SQL column
  const sortMap: Record<string, string> = {
    name: fields!.name,
    email: fields!.email,
    createdAt: fields!.createdAt,
    lastActive: fields!.lastActive || fields!.createdAt,
    status: fields!.status,
  };
  const orderCol = sortMap[sortBy] || fields!.createdAt;

  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(${fields!.email} ILIKE $${params.length} OR (${fields!.name})::text ILIKE $${params.length})`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`${fields!.createdAt} >= $${params.length}::timestamp`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`${fields!.createdAt} <= $${params.length}::timestamp`);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')} ${botFilter}`
    : `WHERE 1=1 ${botFilter}`;

  const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName} ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count);

  const result = await pool.query(`
    SELECT
      ${fields!.id} AS id,
      ${fields!.email} AS email,
      (${fields!.name})::text AS name,
      ${fields!.createdAt} AS "createdAt",
      ${fields!.lastActive || 'NULL'} AS "lastActive",
      (${fields!.status})::text AS status,
      (${fields!.role})::text AS role,
      ${fields!.avatarUrl || 'NULL'} AS "avatarUrl",
      (${fields!.provider})::text AS provider,
      (${fields!.plan || `'free'`})::text AS plan
    FROM ${tableName}
    ${whereClause}
    ORDER BY ${orderCol} ${sortDir.toUpperCase()}
    LIMIT ${limit} OFFSET ${offset}
  `, params);

  return {
    users: result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.createdAt?.toISOString?.() || row.createdAt,
      lastActive: row.lastActive?.toISOString?.() || row.lastActive,
      status: row.status || 'active',
      role: row.role || 'user',
      avatarUrl: row.avatarUrl,
      provider: (row.provider === 'google' || row.provider === 'apple' || row.provider === 'device') ? row.provider : 'email',
      plan: row.plan || 'free',
      project: config.slug,
      projectName: config.displayName,
      projectColor: config.color,
    })),
    total,
  };
}

async function fetchPlanMapForProject(client: SupabaseClient, slug: string, userIds: string[]): Promise<Record<string, string>> {
  const planMap: Record<string, string> = {};
  if (userIds.length === 0) return planMap;

  try {
    if (slug === 'construction') {
      // company_members → companies
      const { data: members } = await client.from('company_members').select('user_id, company_id').in('user_id', userIds);
      if (members && members.length > 0) {
        const companyIds = [...new Set(members.map((m: any) => m.company_id))];
        const { data: companies } = await client.from('companies').select('id, subscription_plan').in('id', companyIds);
        const companyPlanMap: Record<string, string> = {};
        for (const c of companies || []) companyPlanMap[c.id] = c.subscription_plan || 'starter';
        for (const m of members) planMap[m.user_id] = companyPlanMap[m.company_id] || 'starter';
      }
    } else if (slug === 'govirall' || slug === 'opticrank') {
      // profiles → organizations
      const { data: profiles } = await client.from('profiles').select('id, organization_id').in('id', userIds);
      if (profiles && profiles.length > 0) {
        const orgIds = [...new Set(profiles.filter((p: any) => p.organization_id).map((p: any) => p.organization_id))];
        if (orgIds.length > 0) {
          const { data: orgs } = await client.from('organizations').select('id, plan').in('id', orgIds);
          const orgPlanMap: Record<string, string> = {};
          for (const o of orgs || []) orgPlanMap[o.id] = o.plan || 'free';
          for (const p of profiles) {
            if (p.organization_id) planMap[p.id] = orgPlanMap[p.organization_id] || 'free';
          }
        }
      }
    } else if (slug === 'topviso') {
      // organization_members → organizations (plan_tier)
      const { data: members } = await client.from('organization_members').select('user_id, organization_id').in('user_id', userIds);
      if (members && members.length > 0) {
        const orgIds = [...new Set(members.map((m: any) => m.organization_id))];
        if (orgIds.length > 0) {
          const { data: orgs } = await client.from('organizations').select('id, plan_tier').in('id', orgIds);
          const orgPlanMap: Record<string, string> = {};
          for (const o of orgs || []) orgPlanMap[o.id] = o.plan_tier || 'solo';
          for (const m of members) planMap[m.user_id] = orgPlanMap[m.organization_id] || 'solo';
        }
      }
    }
  } catch (err) {
    console.error(`Failed to fetch plan data for ${slug}:`, err);
  }

  return planMap;
}

function getSupabaseUserProvider(user: any): 'google' | 'apple' | 'email' {
  const provider = user.app_metadata?.provider || user.app_metadata?.providers?.[0] || 'email';
  if (provider === 'google') return 'google';
  if (provider === 'apple') return 'apple';
  return 'email';
}

async function fetchSupabaseAuthUsers(config: ProjectConfig, options: FetchUsersOptions): Promise<{ users: NormalizedUser[]; total: number }> {
  const client = getSupabaseClient(config);
  if (!client) throw new Error(`No Supabase credentials for ${config.displayName}`);

  const { page = 1, limit = 25, search, dateFrom, dateTo } = options;

  // If this project has bot profiles, fetch bot IDs to exclude
  const botIds = config.hasBotProfiles ? await fetchBotUserIds(client) : new Set<string>();

  // Supabase admin API fetches all users; we filter/paginate in-memory
  let allUsers: any[] = [];
  let fetchPage = 1;
  const perPage = 1000;

  while (true) {
    const { data: { users }, error } = await client.auth.admin.listUsers({ page: fetchPage, perPage });
    if (error) throw error;
    if (!users || users.length === 0) break;
    allUsers = allUsers.concat(users);
    if (users.length < perPage) break;
    fetchPage++;
  }

  // Filter out bots
  if (botIds.size > 0) {
    allUsers = allUsers.filter(u => !botIds.has(u.id));
  }

  // Apply filters
  if (search) {
    const s = search.toLowerCase();
    allUsers = allUsers.filter(u =>
      u.email?.toLowerCase().includes(s) ||
      (u.user_metadata?.full_name || u.user_metadata?.name || u.user_metadata?.display_name || '').toLowerCase().includes(s)
    );
  }
  if (dateFrom) {
    const from = new Date(dateFrom);
    allUsers = allUsers.filter(u => new Date(u.created_at) >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo);
    allUsers = allUsers.filter(u => new Date(u.created_at) <= to);
  }

  // Sort
  const { sortBy = 'createdAt', sortDir = 'desc' } = options;
  allUsers.sort((a, b) => {
    let valA: any, valB: any;
    switch (sortBy) {
      case 'email': valA = a.email; valB = b.email; break;
      case 'name': valA = a.user_metadata?.full_name || ''; valB = b.user_metadata?.full_name || ''; break;
      case 'lastActive': valA = a.last_sign_in_at || ''; valB = b.last_sign_in_at || ''; break;
      default: valA = a.created_at; valB = b.created_at;
    }
    const cmp = String(valA).localeCompare(String(valB));
    return sortDir === 'desc' ? -cmp : cmp;
  });

  const total = allUsers.length;
  const start = (page - 1) * limit;
  const paged = allUsers.slice(start, start + limit);

  // Enrich with subscription plan data
  const planMap = await fetchPlanMapForProject(client, config.slug, paged.map(u => u.id));

  return {
    users: paged.map(u => ({
      id: u.id,
      email: u.email || '',
      name: u.user_metadata?.full_name || u.user_metadata?.name || u.user_metadata?.display_name || null,
      createdAt: u.created_at,
      lastActive: u.last_sign_in_at || null,
      status: u.banned_until ? 'banned' : 'active',
      role: u.role || 'user',
      avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
      provider: getSupabaseUserProvider(u),
      plan: planMap[u.id] || 'free',
      project: config.slug,
      projectName: config.displayName,
      projectColor: config.color,
    })),
    total,
  };
}

async function fetchSupabaseTableUsers(config: ProjectConfig, options: FetchUsersOptions): Promise<{ users: NormalizedUser[]; total: number }> {
  const client = getSupabaseClient(config);
  if (!client) throw new Error(`No Supabase credentials for ${config.displayName}`);

  const table = config.supabaseTable!;
  const f = config.supabaseFields;
  const botCol = config.supabaseBotColumn;

  // Field mappings with defaults
  const nameCol = f?.name || 'full_name';
  const emailCol = f?.email || 'email';
  const createdAtCol = f?.createdAt || 'created_at';
  const lastActiveCol = f?.lastActive || 'last_login';
  const statusCol = f?.status || null;
  const roleCol = f?.role || null;
  const avatarCol = f?.avatarUrl || null;

  const { page = 1, limit = 25, sortBy = 'createdAt', sortDir = 'desc', search, dateFrom, dateTo } = options;
  const offset = (page - 1) * limit;

  // Map sort field to actual column
  const sortMap: Record<string, string> = {
    name: nameCol,
    email: emailCol,
    createdAt: createdAtCol,
    lastActive: lastActiveCol || createdAtCol,
  };
  const orderCol = sortMap[sortBy] || createdAtCol;

  // Select columns
  const selectCols = f?.selectExtra || `id, ${emailCol}, ${nameCol}, ${createdAtCol}, ${lastActiveCol}`;

  // Count query
  let countQuery = client.from(table).select('*', { count: 'exact', head: true });
  if (botCol) countQuery = countQuery.neq(botCol, true);
  if (search) countQuery = countQuery.or(`${emailCol}.ilike.%${search}%,${nameCol}.ilike.%${search}%`);
  if (dateFrom) countQuery = countQuery.gte(createdAtCol, dateFrom);
  if (dateTo) countQuery = countQuery.lte(createdAtCol, dateTo);
  const { count: total } = await countQuery;

  // Data query
  let dataQuery = client.from(table)
    .select(selectCols)
    .order(orderCol, { ascending: sortDir === 'asc' })
    .range(offset, offset + limit - 1);

  if (botCol) dataQuery = dataQuery.neq(botCol, true);
  if (search) dataQuery = dataQuery.or(`${emailCol}.ilike.%${search}%,${nameCol}.ilike.%${search}%`);
  if (dateFrom) dataQuery = dataQuery.gte(createdAtCol, dateFrom);
  if (dateTo) dataQuery = dataQuery.lte(createdAtCol, dateTo);

  const { data, error } = await dataQuery;
  if (error) throw error;

  const idCol = f?.id || 'id';
  return {
    users: (data || []).map((row: any) => ({
      id: row[idCol],
      email: row[emailCol] || '',
      name: row[nameCol] || row['name'] || null,
      createdAt: row[createdAtCol],
      lastActive: lastActiveCol ? row[lastActiveCol] || null : null,
      status: statusCol ? (row[statusCol]?.toLowerCase?.() || 'active') : 'active',
      role: roleCol ? (row[roleCol]?.toLowerCase?.() || 'user') : 'user',
      avatarUrl: avatarCol ? row[avatarCol] || null : null,
      provider: 'email' as const,
      plan: row['subscription_tier'] || row['plan'] || 'free',
      project: config.slug,
      projectName: config.displayName,
      projectColor: config.color,
    })),
    total: total || 0,
  };
}

// ─── Growth Data ─────────────────────────────────────────────────────────────

async function fetchPgGrowthData(config: ProjectConfig, days: number): Promise<{ date: string; count: number }[]> {
  const pool = getPgPool(config);
  if (!pool) throw new Error(`No DB URL for ${config.displayName}`);

  const { fields, tableName, excludeBotsSql } = config;
  const botFilter = excludeBotsSql || '';
  const result = await pool.query(`
    SELECT
      DATE_TRUNC('day', ${fields!.createdAt}) AS date,
      COUNT(*) AS count
    FROM ${tableName}
    WHERE ${fields!.createdAt} >= NOW() - INTERVAL '${days} days' ${botFilter}
    GROUP BY DATE_TRUNC('day', ${fields!.createdAt})
    ORDER BY date
  `);

  return result.rows.map(row => ({
    date: row.date.toISOString().split('T')[0],
    count: parseInt(row.count),
  }));
}

async function fetchSupabaseAuthGrowthData(config: ProjectConfig, days: number): Promise<{ date: string; count: number }[]> {
  const client = getSupabaseClient(config);
  if (!client) throw new Error(`No Supabase credentials for ${config.displayName}`);

  const botIds = config.hasBotProfiles ? await fetchBotUserIds(client) : new Set<string>();

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  let allUsers: any[] = [];
  let page = 1;

  while (true) {
    const { data: { users }, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    if (!users || users.length === 0) break;
    allUsers = allUsers.concat(users);
    if (users.length < 1000) break;
    page++;
  }

  // Group by day, excluding bots
  const counts: Record<string, number> = {};
  for (const user of allUsers) {
    if (botIds.has(user.id)) continue;
    const created = new Date(user.created_at);
    if (created >= cutoff) {
      const dateKey = created.toISOString().split('T')[0];
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchSupabaseTableGrowthData(config: ProjectConfig, days: number): Promise<{ date: string; count: number }[]> {
  const client = getSupabaseClient(config);
  if (!client) throw new Error(`No Supabase credentials for ${config.displayName}`);

  const createdAtCol = config.supabaseFields?.createdAt || 'created_at';
  const botCol = config.supabaseBotColumn;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = client
    .from(config.supabaseTable!)
    .select(createdAtCol)
    .gte(createdAtCol, cutoff)
    .order(createdAtCol, { ascending: true });

  if (botCol) query = query.neq(botCol, true);

  const { data, error } = await query;
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of (data || []) as any[]) {
    const dateKey = new Date(row[createdAtCol]).toISOString().split('T')[0];
    counts[dateKey] = (counts[dateKey] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function fetchAllProjectOverview(): Promise<{
  projects: ProjectOverview[];
  totals: { total: number; new30d: number; new7d: number };
}> {
  const results = await Promise.allSettled(
    PROJECT_CONFIGS.map(async (config) => {
      let counts: { total: number; new30d: number; new7d: number };

      switch (config.connectionType) {
        case 'pg':
          counts = await fetchPgUserCount(config);
          break;
        case 'prisma':
          counts = await fetchPrismaUserCount(config);
          break;
        case 'supabase-auth':
          counts = await fetchSupabaseAuthUserCount(config);
          break;
        case 'supabase-table':
          counts = await fetchSupabaseTableUserCount(config);
          break;
      }

      return {
        slug: config.slug,
        displayName: config.displayName,
        color: config.color,
        ...counts,
      } as ProjectOverview;
    })
  );

  const projects: ProjectOverview[] = [];
  const totals = { total: 0, new30d: 0, new7d: 0 };

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const config = PROJECT_CONFIGS[i];

    if (result.status === 'fulfilled') {
      projects.push(result.value);
      totals.total += result.value.total;
      totals.new30d += result.value.new30d;
      totals.new7d += result.value.new7d;
    } else {
      console.error(`Failed to fetch users for ${config.displayName}:`, result.reason);
      projects.push({
        slug: config.slug,
        displayName: config.displayName,
        color: config.color,
        total: 0,
        new30d: 0,
        new7d: 0,
        error: result.reason?.message || 'Connection failed',
      });
    }
  }

  return { projects, totals };
}

export async function fetchProjectUsers(projectSlug: string, options: FetchUsersOptions): Promise<{ users: NormalizedUser[]; total: number }> {
  const config = PROJECT_CONFIGS.find(c => c.slug === projectSlug);
  if (!config) throw new Error(`Unknown project: ${projectSlug}`);

  switch (config.connectionType) {
    case 'pg':
      return fetchPgUsers(config, options);
    case 'prisma':
      return fetchPrismaUsers(config, options);
    case 'supabase-auth':
      return fetchSupabaseAuthUsers(config, options);
    case 'supabase-table':
      return fetchSupabaseTableUsers(config, options);
  }
}

export async function fetchAllUsers(options: FetchUsersOptions): Promise<{ users: NormalizedUser[]; total: number }> {
  const { page = 1, limit = 25, sortBy = 'createdAt', sortDir = 'desc' } = options;

  // Fetch from all projects in parallel (limited per project for performance)
  const results = await Promise.allSettled(
    PROJECT_CONFIGS.map(config => {
      switch (config.connectionType) {
        case 'pg':
          return fetchPgUsers(config, { ...options, page: 1, limit: 500 });
        case 'prisma':
          return fetchPrismaUsers(config, { ...options, page: 1, limit: 500 });
        case 'supabase-auth':
          return fetchSupabaseAuthUsers(config, { ...options, page: 1, limit: 500 });
        case 'supabase-table':
          return fetchSupabaseTableUsers(config, { ...options, page: 1, limit: 500 });
      }
    })
  );

  let allUsers: NormalizedUser[] = [];
  let totalCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allUsers = allUsers.concat(result.value.users);
      totalCount += result.value.total;
    }
  }

  // Sort merged results
  allUsers.sort((a, b) => {
    let valA = '', valB = '';
    switch (sortBy) {
      case 'email': valA = a.email; valB = b.email; break;
      case 'name': valA = a.name || ''; valB = b.name || ''; break;
      case 'lastActive': valA = a.lastActive || ''; valB = b.lastActive || ''; break;
      case 'project': valA = a.projectName; valB = b.projectName; break;
      default: valA = a.createdAt; valB = b.createdAt;
    }
    const cmp = valA.localeCompare(valB);
    return sortDir === 'desc' ? -cmp : cmp;
  });

  // Paginate
  const start = (page - 1) * limit;
  const paged = allUsers.slice(start, start + limit);

  return { users: paged, total: totalCount };
}

export async function fetchAllGrowthData(days: number = 90): Promise<GrowthDataPoint[]> {
  const results = await Promise.allSettled(
    PROJECT_CONFIGS.map(async (config) => {
      let data: { date: string; count: number }[];

      switch (config.connectionType) {
        case 'pg':
          data = await fetchPgGrowthData(config, days);
          break;
        case 'prisma':
          data = await fetchPrismaGrowthData(config, days);
          break;
        case 'supabase-auth':
          data = await fetchSupabaseAuthGrowthData(config, days);
          break;
        case 'supabase-table':
          data = await fetchSupabaseTableGrowthData(config, days);
          break;
      }

      return { slug: config.slug, data };
    })
  );

  // Merge all growth data into unified timeline
  const dateMap: Record<string, Record<string, number>> = {};

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { slug, data } = result.value;
    for (const point of data) {
      if (!dateMap[point.date]) dateMap[point.date] = {};
      dateMap[point.date][slug] = point.count;
    }
  }

  // Fill missing dates with 0 and sort
  const allDates = Object.keys(dateMap).sort();
  const slugs = PROJECT_CONFIGS.map(c => c.slug);

  return allDates.map(date => {
    const point: GrowthDataPoint = { date };
    for (const slug of slugs) {
      point[slug] = dateMap[date]?.[slug] || 0;
    }
    return point;
  });
}
