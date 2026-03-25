import { pgTable, serial, timestamp, varchar, text, integer, boolean, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod"

// ==================== 用户表 ====================
export const users = pgTable(
  "users",
  {
    id: serial().primaryKey(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("user"), // user, admin, super_admin
    // Rating系统
    creditRating: integer("credit_rating").default(100).notNull(), // 个人信用，初始100
    problemRating: integer("problem_rating").default(0).notNull(), // 做题得分
    contestRating: integer("contest_rating").default(0).notNull(), // 比赛得分
    totalRating: integer("total_rating").default(100).notNull(), // 总Rating
    nameColor: varchar("name_color", { length: 20 }).default("gray").notNull(), // gray, blue, green, orange, red, purple, brown
    // 统计 - 洛谷风格难度
    solvedEntry: integer("solved_entry").default(0).notNull(), // 入门
    solvedPopularMinus: integer("solved_popular_minus").default(0).notNull(), // 普及-
    solvedPopular: integer("solved_popular").default(0).notNull(), // 普及/提高-
    solvedPopularPlus: integer("solved_popular_plus").default(0).notNull(), // 普及+/提高
    solvedImprovePlus: integer("solved_improve_plus").default(0).notNull(), // 提高+/省选-
    solvedProvincial: integer("solved_provincial").default(0).notNull(), // 省选/NOI-
    solvedNoi: integer("solved_noi").default(0).notNull(), // NOI/NOI+/CTSC
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("users_username_idx").on(table.username),
    index("users_role_idx").on(table.role),
  ]
);

// ==================== 题目表 ====================
export const problems = pgTable(
  "problems",
  {
    id: serial().primaryKey(),
    // 题库分类: P题库(题目), B题库(入门), M题库(比赛), F题库(专题)
    category: varchar("category", { length: 1 }).notNull().default("P"),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    inputFormat: text("input_format"),
    outputFormat: text("output_format"),
    samples: jsonb("samples").$type<Array<{ input: string; output: string }>>().default([]),
    hint: text("hint"),
    // 洛谷风格难度: entry(入门红), popular_minus(普及-橙), popular(普及/提高-黄), popular_plus(普及+/提高绿), improve_plus(提高+/省选-蓝), provincial(省选/NOI-紫), noi(NOI/NOI+/CTSC黑)
    difficulty: varchar("difficulty", { length: 20 }).notNull().default("popular"),
    timeLimit: integer("time_limit").default(1000), // ms
    memoryLimit: integer("memory_limit").default(256), // MB
    isVisible: boolean("is_visible").default(true).notNull(),
    authorId: integer("author_id").notNull(),
    tags: jsonb("tags").$type<string[]>().default([]),
    testCases: jsonb("test_cases").$type<Array<{ input: string; output: string; inputKey?: string; outputKey?: string; score?: number }>>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("problems_category_idx").on(table.category),
    index("problems_difficulty_idx").on(table.difficulty),
    index("problems_author_idx").on(table.authorId),
    index("problems_visible_idx").on(table.isVisible),
  ]
);

// ==================== 提交记录表 ====================
export const submissions = pgTable(
  "submissions",
  {
    id: serial().primaryKey(),
    problemId: integer("problem_id").notNull(),
    userId: integer("user_id").notNull(),
    language: varchar("language", { length: 20 }).notNull(), // cpp, python, html
    code: text("code").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, ac, wa, ce, re, tle, mle
    score: integer("score").default(0),
    timeUsed: integer("time_used"), // ms
    memoryUsed: integer("memory_used"), // KB
    errorMessage: text("error_message"),
    contestId: integer("contest_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("submissions_problem_idx").on(table.problemId),
    index("submissions_user_idx").on(table.userId),
    index("submissions_status_idx").on(table.status),
    index("submissions_contest_idx").on(table.contestId),
  ]
);

// ==================== 题解表 ====================
export const solutions = pgTable(
  "solutions",
  {
    id: serial().primaryKey(),
    problemId: integer("problem_id").notNull(),
    userId: integer("user_id").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content").notNull(),
    likes: integer("likes").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("solutions_problem_idx").on(table.problemId),
    index("solutions_user_idx").on(table.userId),
  ]
);

// ==================== 比赛表 ====================
export const contests = pgTable(
  "contests",
  {
    id: serial().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    type: varchar("type", { length: 20 }).notNull().default("oi"), // oi, ioi
    problemIds: jsonb("problem_ids").$type<number[]>().default([]),
    authorId: integer("author_id").notNull(),
    isVisible: boolean("is_visible").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("contests_time_idx").on(table.startTime, table.endTime),
    index("contests_author_idx").on(table.authorId),
  ]
);

// ==================== 比赛参与记录表 ====================
export const contestParticipants = pgTable(
  "contest_participants",
  {
    id: serial().primaryKey(),
    contestId: integer("contest_id").notNull(),
    userId: integer("user_id").notNull(),
    score: integer("score").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("contest_participants_contest_idx").on(table.contestId),
    index("contest_participants_user_idx").on(table.userId),
  ]
);

// ==================== 讨论表 ====================
export const discussions = pgTable(
  "discussions",
  {
    id: serial().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content").notNull(),
    authorId: integer("author_id").notNull(),
    problemId: integer("problem_id"),
    parentId: integer("parent_id"), // 回复的讨论ID
    likes: integer("likes").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("discussions_author_idx").on(table.authorId),
    index("discussions_problem_idx").on(table.problemId),
    index("discussions_parent_idx").on(table.parentId),
  ]
);

// ==================== 代码分享表 ====================
export const codeShares = pgTable(
  "code_shares",
  {
    id: serial().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    code: text("code").notNull(),
    language: varchar("language", { length: 20 }).notNull(), // cpp, python, html
    authorId: integer("author_id").notNull(),
    description: text("description"),
    views: integer("views").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("code_shares_author_idx").on(table.authorId),
    index("code_shares_language_idx").on(table.language),
  ]
);

// ==================== 工单表 ====================
export const tickets = pgTable(
  "tickets",
  {
    id: serial().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content").notNull(),
    type: varchar("type", { length: 20 }).notNull(), // suggestion, problem_request
    problemId: integer("problem_id"),
    authorId: integer("author_id").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, accepted, rejected
    handlerId: integer("handler_id"),
    reply: text("reply"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("tickets_author_idx").on(table.authorId),
    index("tickets_status_idx").on(table.status),
    index("tickets_type_idx").on(table.type),
  ]
);

// ==================== 犇犇表（动态/说说） ====================
export const benbens = pgTable(
  "benbens",
  {
    id: serial().primaryKey(),
    content: text("content").notNull(),
    authorId: integer("author_id").notNull(),
    likes: integer("likes").default(0),
    replyCount: integer("reply_count").default(0),
    parentId: integer("parent_id"), // 回复的犇犇ID（空则为主题）
    replyToId: integer("reply_to_id"), // 回复的评论ID
    replyToUserId: integer("reply_to_user_id"), // 被回复的用户ID
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("benbens_author_idx").on(table.authorId),
    index("benbens_parent_idx").on(table.parentId),
    index("benbens_created_idx").on(table.createdAt),
  ]
);

// ==================== 用户关注表 ====================
export const userFollows = pgTable(
  "user_follows",
  {
    id: serial().primaryKey(),
    followerId: integer("follower_id").notNull(), // 关注者
    followingId: integer("following_id").notNull(), // 被关注者
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("user_follows_follower_idx").on(table.followerId),
    index("user_follows_following_idx").on(table.followingId),
  ]
);

// ==================== 消息通知表 ====================
export const notifications = pgTable(
  "notifications",
  {
    id: serial().primaryKey(),
    userId: integer("user_id").notNull(), // 接收通知的用户
    type: varchar("type", { length: 30 }).notNull(), // ticket_reply, benben_mention, follow, like, system
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content"),
    relatedId: integer("related_id"), // 关联对象ID（工单ID、犇犇ID等）
    relatedType: varchar("related_type", { length: 30 }), // ticket, benben, user等
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_is_read_idx").on(table.isRead),
    index("notifications_type_idx").on(table.type),
  ]
);

// ==================== 私信表 ====================
export const privateMessages = pgTable(
  "private_messages",
  {
    id: serial().primaryKey(),
    senderId: integer("sender_id").notNull(),
    receiverId: integer("receiver_id").notNull(),
    content: text("content").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("private_messages_sender_idx").on(table.senderId),
    index("private_messages_receiver_idx").on(table.receiverId),
    index("private_messages_created_idx").on(table.createdAt),
  ]
);

// ==================== 系统健康检查表 ====================
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ==================== Zod Schemas ====================
const { createInsertSchema } = createSchemaFactory({ coerce: { date: true } });

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空"),
});

export const registerUserSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符").max(50, "用户名最多50个字符"),
  password: z.string().min(6, "密码至少6个字符"),
  adminCode: z.string().optional(),
  superAdminCode: z.string().optional(),
});

export const insertProblemSchema = createInsertSchema(problems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  createdAt: true,
});

export const insertSolutionSchema = createInsertSchema(solutions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContestSchema = createInsertSchema(contests).omit({
  id: true,
  createdAt: true,
});

export const insertDiscussionSchema = createInsertSchema(discussions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodeShareSchema = createInsertSchema(codeShares).omit({
  id: true,
  createdAt: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBenbenSchema = createInsertSchema(benbens).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertPrivateMessageSchema = createInsertSchema(privateMessages).omit({
  id: true,
  createdAt: true,
});

// ==================== TypeScript Types ====================
export type User = typeof users.$inferSelect;
export type Problem = typeof problems.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Solution = typeof solutions.$inferSelect;
export type Contest = typeof contests.$inferSelect;
export type Discussion = typeof discussions.$inferSelect;
export type CodeShare = typeof codeShares.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Benben = typeof benbens.$inferSelect;
export type UserFollow = typeof userFollows.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type PrivateMessage = typeof privateMessages.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type InsertSolution = z.infer<typeof insertSolutionSchema>;
export type InsertContest = z.infer<typeof insertContestSchema>;
export type InsertDiscussion = z.infer<typeof insertDiscussionSchema>;
export type InsertCodeShare = z.infer<typeof insertCodeShareSchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type InsertBenben = z.infer<typeof insertBenbenSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertPrivateMessage = z.infer<typeof insertPrivateMessageSchema>;
