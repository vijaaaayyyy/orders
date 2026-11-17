import { createServerFn } from "@tanstack/react-start";
import { dbSource, withSql, type Sql } from "@/lib/db";
import { MENU_NAMES } from "@/lib/menu";

export type OrderStatus = "preparing" | "ready" | "collected";

export type Order = {
  id: number;
  token: number;
  item: string;
  status: OrderStatus;
  createdAt: string;
  readyAt: string | null;
};

export type Board = {
  ready: Order[];
  preparing: Order[];
  servedToday: number;
  nextToken: number;
  serverNow: string;
};

export type Lookup = { found: false } | { found: true; order: Order; ahead: number };

const TZ = "Asia/Kolkata";

type RawOrder = {
  id: unknown;
  token: unknown;
  item: unknown;
  status: unknown;
  createdAt: unknown;
  readyAt: unknown;
};

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asIso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(String(value));
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return null;
}

function asStatus(value: unknown): OrderStatus {
  if (value === "preparing" || value === "ready" || value === "collected") return value;
  return "preparing";
}

function mapOrder(row: RawOrder): Order {
  return {
    id: asNumber(row.id),
    token: asNumber(row.token),
    item: String(row.item),
    status: asStatus(row.status),
    createdAt: asIso(row.createdAt) ?? new Date().toISOString(),
    readyAt: asIso(row.readyAt),
  };
}

async function seedIfPreview(sql: Sql) {
  if (dbSource !== "pglite") return;
  await sql`
    insert into orders (token, item, status, created_at, ready_at)
    select v.token, v.item, v.status,
      now() - make_interval(mins => v.age),
      case
        when v.status = 'ready' then now() - make_interval(mins => v.ready_age)
        else null
      end
    from (
      values
        (14, 'Veg Thali', 'ready', 18, 4),
        (15, 'Masala Dosa', 'ready', 16, 3),
        (18, 'Cold Coffee', 'ready', 11, 1),
        (21, 'Veg Biryani', 'ready', 9, 0),
        (22, 'Maggi', 'preparing', 7, 0),
        (23, 'Special Thali', 'preparing', 6, 0),
        (24, 'Paneer Roll', 'preparing', 4, 0),
        (25, 'Fried Rice', 'preparing', 3, 0),
        (26, 'Masala Chai', 'preparing', 1, 0)
    ) as v(token, item, status, age, ready_age)
    where not exists (select 1 from orders)
  `;
  await sql`
    insert into token_counter (service_date, next_token)
    values ((now() at time zone ${TZ})::date, 27)
    on conflict (service_date) do nothing
  `;
}

export const getBoard = createServerFn({ method: "GET" }).handler(async (): Promise<Board> =>
  withSql(async (sql) => {
    await seedIfPreview(sql);
    const rows = await sql<RawOrder>`
    select id, token, item, status,
      created_at as "createdAt",
      ready_at as "readyAt"
    from orders
    where status in ('preparing', 'ready')
      and (created_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date
      `;
    const orders = rows.map(mapOrder);
    const ready = orders
      .filter((order) => order.status === "ready")
      .sort((a, b) => a.token - b.token);
    const preparing = orders
      .filter((order) => order.status === "preparing")
      .sort((a, b) => a.id - b.id);
    const served = await sql<{ n: unknown }>`
    select count(*)::int as n
    from orders
    where status = 'collected'
      and (created_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date
      `;
    const counter = await sql<{ next_token: unknown }>`
    select next_token
    from token_counter
    where service_date = (now() at time zone ${TZ})::date
      `;
    return {
      ready,
      preparing,
      servedToday: asNumber(served[0]?.n),
      nextToken: counter[0] ? asNumber(counter[0].next_token) : 1,
      serverNow: new Date().toISOString(),
    };
  }),
);

export const placeOrder = createServerFn({ method: "POST" })
  .validator((input: { item: string }) => {
    const item = typeof input?.item === "string" ? input.item.trim() : "";
    if (!MENU_NAMES.has(item)) throw new Error("Pick a dish from the menu");
    return { item };
  })
  .handler(async ({ data }) =>
    withSql(async (sql) => {
      const issued = await sql<{ token: unknown }>`
      insert into token_counter (service_date, next_token)
      values ((now() at time zone ${TZ})::date, 2)
      on conflict (service_date) do update
      set next_token = token_counter.next_token + 1
      returning next_token - 1 as token
        `;
      const token = asNumber(issued[0]?.token);
      const inserted = await sql<RawOrder>`
      insert into orders (token, item, status)
      values (${token}, ${data.item}, 'preparing')
      returning id, token, item, status,
        created_at as "createdAt",
        ready_at as "readyAt"
        `;
      const order = mapOrder(inserted[0]!);
      const aheadRows = await sql<{ ahead: unknown }>`
      select count(*)::int as ahead
      from orders
      where status = 'preparing'
        and id < ${order.id}
        and (created_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date
        `;
      return { order, ahead: asNumber(aheadRows[0]?.ahead) };
    }),
  );

/**
 * Counter-side order at an explicitly chosen token number. Token numbers are
 * caller-supplied (staff can call out / correct a number), so we reject a token
 * already used today and push `token_counter` past it to keep "next token" sane.
 */
export const placeOrderAt = createServerFn({ method: "POST" })
  .validator((input: { items: string[]; token: number }) => {
    const items = Array.isArray(input?.items)
      ? [...new Set(input.items.map((item) => (typeof item === "string" ? item.trim() : "")))]
      : [];
    if (items.length === 0) throw new Error("Pick at least one dish");
    if (!items.every((item) => MENU_NAMES.has(item))) throw new Error("Pick a dish from the menu");
    const token = Number(input?.token);
    if (!Number.isInteger(token) || token < 1 || token > 9999) {
      throw new Error("Enter a token between 1 and 9999");
    }
    return { items, token };
  })
  .handler(async ({ data }) =>
    withSql(async (sql) => {
      const used = await sql<{ id: unknown }>`
      select id from orders
      where token = ${data.token}
        and (created_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date
      limit 1
        `;
      if (used[0]) throw new Error(`Token ${data.token} is already in use today`);

      const orders: Order[] = [];
      for (const item of data.items) {
        const inserted = await sql<RawOrder>`
        insert into orders (token, item, status)
        values (${data.token}, ${item}, 'preparing')
        returning id, token, item, status,
          created_at as "createdAt",
          ready_at as "readyAt"
          `;
        orders.push(mapOrder(inserted[0]!));
      }

      await sql`
      insert into token_counter (service_date, next_token)
      values ((now() at time zone ${TZ})::date, ${data.token + 1})
      on conflict (service_date) do update
      set next_token = greatest(token_counter.next_token, ${data.token + 1})
        `;

      const firstId = Math.min(...orders.map((order) => order.id));
      const aheadRows = await sql<{ ahead: unknown }>`
      select count(*)::int as ahead
      from orders
      where status = 'preparing'
        and id < ${firstId}
        and (created_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date
        `;
      return { orders, ahead: asNumber(aheadRows[0]?.ahead) };
    }),
  );

function idInput(input: { id: number }) {
  const id = Number(input?.id);
  if (!Number.isInteger(id) || id < 1) throw new Error("Unknown order");
  return { id };
}

export const markReady = createServerFn({ method: "POST" })
  .validator(idInput)
  .handler(async ({ data }) =>
    withSql(async (sql) => {
      const rows = await sql<RawOrder>`
      update orders
      set status = 'ready', ready_at = now()
      where id = ${data.id} and status = 'preparing'
      returning id, token, item, status,
        created_at as "createdAt",
        ready_at as "readyAt"
      `;
      if (!rows[0]) throw new Error("That token is not still cooking");
      return mapOrder(rows[0]);
    }),
  );

export const markCollected = createServerFn({ method: "POST" })
  .validator(idInput)
  .handler(async ({ data }) =>
    withSql(async (sql) => {
      const rows = await sql<RawOrder>`
      update orders
      set status = 'collected', collected_at = now()
      where id = ${data.id} and status = 'ready'
      returning id, token, item, status,
        created_at as "createdAt",
        ready_at as "readyAt"
      `;
      if (!rows[0]) throw new Error("That token is not at the pickup counter");
      return mapOrder(rows[0]);
    }),
  );

export const recallOrder = createServerFn({ method: "POST" })
  .validator(idInput)
  .handler(async ({ data }) =>
    withSql(async (sql) => {
      const rows = await sql<RawOrder>`
      update orders
      set status = 'preparing', ready_at = null
      where id = ${data.id} and status = 'ready'
      returning id, token, item, status,
        created_at as "createdAt",
        ready_at as "readyAt"
      `;
      if (!rows[0]) throw new Error("That token is not ready");
      return mapOrder(rows[0]);
    }),
  );

export type ServerPulse = {
  now: string;
  uptimeSec: number;
  node: string;
  env: string;
  db: "neon" | "pglite";
  commit: string | null;
  counts: {
    ordersToday: number;
    cooking: number;
    ready: number;
    served: number;
  };
  events: Array<{
    token: number;
    item: string;
    status: OrderStatus;
    at: string;
  }>;
};

type RawEvent = {
  token: unknown;
  item: unknown;
  status: unknown;
  at: unknown;
};

/** Real runtime + order activity for the server.log panel. */
export const getServerPulse = createServerFn({ method: "GET" }).handler(
  async (): Promise<ServerPulse> =>
    withSql(async (sql) => {
      const counts = await sql<{
        orders_today: unknown;
        cooking: unknown;
        ready: unknown;
        served: unknown;
      }>`
      select
        count(*)::int as orders_today,
        count(*) filter (where status = 'preparing')::int as cooking,
        count(*) filter (where status = 'ready')::int as ready,
        count(*) filter (where status = 'collected')::int as served
      from orders
      where (created_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date
      `;
      const events = await sql<RawEvent>`
      select token, item, status,
        case status
          when 'collected' then collected_at
          when 'ready' then ready_at
          else created_at
        end as at
      from orders
      where (created_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date
      order by at desc nulls last
      limit 5
      `;
      return {
        now: new Date().toISOString(),
        uptimeSec:
          typeof process !== "undefined" && typeof process.uptime === "function"
            ? Math.round(process.uptime())
            : 0,
        node: typeof process !== "undefined" ? (process.version ?? "worker") : "worker",
        env:
          (typeof process !== "undefined"
            ? (process.env?.VERCEL_ENV ?? process.env?.NODE_ENV)
            : undefined) ?? "cloudflare-workers",
        db: dbSource,
        commit:
          (typeof process !== "undefined"
            ? (process.env?.VERCEL_GIT_COMMIT_SHA ?? process.env?.CF_PAGES_COMMIT_SHA)
            : undefined
          )?.slice(0, 7) ?? null,
        counts: {
          ordersToday: asNumber(counts[0]?.orders_today),
          cooking: asNumber(counts[0]?.cooking),
          ready: asNumber(counts[0]?.ready),
          served: asNumber(counts[0]?.served),
        },
        events: events.map((row) => ({
          token: asNumber(row.token),
          item: String(row.item),
          status: asStatus(row.status),
          at: asIso(row.at) ?? new Date().toISOString(),
        })),
      };
    }),
);

export const lookupToken = createServerFn({ method: "POST" })
  .validator((input: { token: number }) => {
    const token = Number(input?.token);
    if (!Number.isInteger(token) || token < 1 || token > 9999) {
      throw new Error("Enter a token between 1 and 9999");
    }
    return { token };
  })
  .handler(async ({ data }): Promise<Lookup> =>
    withSql(async (sql) => {
      const rows = await sql<RawOrder>`
      select id, token, item, status,
        created_at as "createdAt",
        ready_at as "readyAt"
      from orders
      where token = ${data.token}
        and (created_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date
      order by id desc
      limit 1
      `;
      if (!rows[0]) return { found: false };
      const order = mapOrder(rows[0]);
      let ahead = 0;
      if (order.status === "preparing") {
        const aheadRows = await sql<{ ahead: unknown }>`
        select count(*)::int as ahead
        from orders
        where status = 'preparing'
          and id < ${order.id}
          and (created_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date
        `;
        ahead = asNumber(aheadRows[0]?.ahead);
      }
      return { found: true, order, ahead };
    }),
  );
