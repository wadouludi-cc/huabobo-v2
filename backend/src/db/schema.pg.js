const { pgTable, text, integer, bigint, boolean, uniqueIndex, index } = require('drizzle-orm/pg-core');

/** PostgreSQL schema. JS keys are camelCase, DB columns snake_case.
 *  IDs are TEXT primary keys (legacy ObjectId hex strings are kept as-is).
 *  Timestamps are BIGINT millis. JSON-ish fields are TEXT (app serializes).
 */
const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  nickname: text('nickname').notNull().default('新用户'),
  handle: text('handle').notNull().default(''),
  avatar: text('avatar').notNull().default('images/author-user-me.jpg'),
  bio: text('bio').notNull().default(''),
  type: text('type').notNull().default('member'),
  joinDate: text('join_date').notNull().default(''),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

const works = pgTable('works', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  image: text('image').notNull().default(''),
  tag: text('tag').notNull().default(''),
  desc: text('desc').notNull().default(''),
  publishedAt: bigint('published_at', { mode: 'number' }),
  status: text('status').notNull().default('draft'),
  workType: text('work_type').notNull().default('model'),
  studio: text('studio').notNull().default(''),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
}, (t) => [index('works_status_published_idx').on(t.status, t.publishedAt)]);

const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  workId: text('work_id')
    .notNull()
    .references(() => works.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

const likes = pgTable(
  'likes',
  {
    id: text('id').primaryKey(),
    workId: text('work_id')
      .notNull()
      .references(() => works.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: bigint('created_at', { mode: 'number' }).notNull()
  },
  (t) => [uniqueIndex('likes_work_user_unique').on(t.workId, t.userId)]
);

const news = pgTable('news', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  image: text('image').notNull().default(''),
  summary: text('summary').notNull().default(''),
  content: text('content').notNull().default(''),
  publishedAt: bigint('published_at', { mode: 'number' }).notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

const artisans = pgTable('artisans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  title: text('title').notNull().default(''),
  bio: text('bio').notNull().default(''),
  image: text('image').notNull().default(''),
  tags: text('tags').notNull().default('[]'),
  sortOrder: integer('sort_order').notNull().default(0),
  portfolio: text('portfolio').notNull().default('[]'),
  contact: text('contact').notNull().default('{}'),
  wechat: text('wechat').notNull().default('{}'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

const studioModelCategories = pgTable('studio_model_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

const studioModels = pgTable('studio_models', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  desc: text('desc').notNull().default(''),
  glbUrl: text('glb_url').notNull(),
  thumbnail: text('thumbnail').notNull().default(''),
  categoryId: text('category_id').references(() => studioModelCategories.id),
  categoryIds: text('category_ids').notNull().default('[]'),
  sortOrder: integer('sort_order').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
}, (t) => [index('studio_models_enabled_idx').on(t.enabled)]);

const digitalHumans = pgTable('digital_humans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  gender: text('gender').notNull().default('female'),
  glbUrl: text('glb_url').notNull(),
  thumbnail: text('thumbnail').notNull().default(''),
  backgroundType: text('background_type').notNull().default('color'),
  backgroundColor: text('background_color').notNull().default('#f3ebe0'),
  backgroundImage: text('background_image').notNull().default(''),
  enabled: boolean('enabled').notNull().default(false),
  rigInfo: text('rig_info').notNull().default('{}'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
}, (t) => [index('digital_humans_enabled_idx').on(t.enabled)]);

const aboutPages = pgTable('about_pages', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  heroTitle: text('hero_title').notNull().default('关于我们'),
  heroSubtitle: text('hero_subtitle').notNull().default(''),
  introTitle: text('intro_title').notNull().default('平台简介'),
  introText: text('intro_text').notNull().default(''),
  introImage: text('intro_image').notNull().default(''),
  values: text('values').notNull().default('[]'),
  printSectionTitle: text('print_section_title').notNull().default('可打印作品展示'),
  printSectionDesc: text('print_section_desc').notNull().default(''),
  printWorks: text('print_works').notNull().default('[]'),
  joinTitle: text('join_title').notNull().default('加入我们'),
  joinText: text('join_text').notNull().default(''),
  contact: text('contact').notNull().default('{}'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

const printOrders = pgTable('print_orders', {
  id: text('id').primaryKey(),
  workId: text('work_id').notNull().default(''),
  userId: text('user_id').notNull().default(''),
  contact: text('contact').notNull().default(''),
  note: text('note').notNull().default(''),
  status: text('status').notNull().default('pending'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

/** 定制订单：用户把自己的 DIY 作品推送给指定合作手艺人 */
const customOrders = pgTable(
  'custom_orders',
  {
    id: text('id').primaryKey(),
    workId: text('work_id').notNull().default(''),
    userId: text('user_id').notNull().default(''),
    artisanId: text('artisan_id').notNull().default(''),
    artisanName: text('artisan_name').notNull().default(''),
    note: text('note').notNull().default(''),
    status: text('status').notNull().default('pending'),
    /** 下单时快照的收货信息（之后用户改地址不影响已进行中的订单） */
    shipName: text('ship_name').notNull().default(''),
    shipPhone: text('ship_phone').notNull().default(''),
    shipAddress: text('ship_address').notNull().default(''),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
  },
  (t) => [
    index('custom_orders_user_idx').on(t.userId),
    index('custom_orders_status_idx').on(t.status)
  ]
);

/** 用户默认收货地址：新订单自动采用，一个用户一条 */
const userAddresses = pgTable(
  'user_addresses',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull().default(''),
    phone: text('phone').notNull().default(''),
    address: text('address').notNull().default(''),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
  },
  (t) => [uniqueIndex('user_addresses_user_idx').on(t.userId)]
);

/** 收货地址变更申请：用户改地址后需管理员审核，通过后才生效 */
const addressChangeRequests = pgTable(
  'address_change_requests',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    /** pending 待审核 / approved 已同意 / rejected 已驳回 */
    status: text('status').notNull().default('pending'),
    oldName: text('old_name').notNull().default(''),
    oldPhone: text('old_phone').notNull().default(''),
    oldAddress: text('old_address').notNull().default(''),
    newName: text('new_name').notNull().default(''),
    newPhone: text('new_phone').notNull().default(''),
    newAddress: text('new_address').notNull().default(''),
    reviewedBy: text('reviewed_by').notNull().default(''),
    reviewedAt: bigint('reviewed_at', { mode: 'number' }),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
  },
  (t) => [
    index('address_change_requests_user_idx').on(t.userId),
    index('address_change_requests_status_idx').on(t.status)
  ]
);

module.exports = {
  users,
  works,
  comments,
  likes,
  news,
  artisans,
  studioModels,
  studioModelCategories,
  digitalHumans,
  aboutPages,
  printOrders,
  customOrders,
  userAddresses,
  addressChangeRequests
};
