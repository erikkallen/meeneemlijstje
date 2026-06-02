import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lists = pgTable("lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  shareToken: uuid("share_token").defaultRandom().unique().notNull(),
  allowMultipleClaimants: boolean("allow_multiple_claimants").default(false).notNull(),
  showWhoBrings: boolean("show_who_brings").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  listId: uuid("list_id")
    .references(() => lists.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const items = pgTable("items", {
  id: uuid("id").defaultRandom().primaryKey(),
  listId: uuid("list_id")
    .references(() => lists.id, { onDelete: "cascade" })
    .notNull(),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  description: text("description"),
  quantityNeeded: integer("quantity_needed").default(1).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const guestSessions = pgTable("guest_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  listId: uuid("list_id")
    .references(() => lists.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  sessionToken: uuid("session_token").defaultRandom().unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const claims = pgTable("claims", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .references(() => items.id, { onDelete: "cascade" })
    .notNull(),
  guestSessionId: uuid("guest_session_id").references(() => guestSessions.id, {
    onDelete: "cascade",
  }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type List = typeof lists.$inferSelect;
export type NewList = typeof lists.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Item = typeof items.$inferSelect;
export type GuestSession = typeof guestSessions.$inferSelect;
export type Claim = typeof claims.$inferSelect;
