import { z } from "zod/v4";
export declare const ingestedTicketsTable: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "ingested_tickets";
    schema: undefined;
    columns: {
        storageKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "storage_key";
            tableName: "ingested_tickets";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 255;
        }>;
        sourceId: import("drizzle-orm/pg-core").PgColumn<{
            name: "source_id";
            tableName: "ingested_tickets";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 128;
        }>;
        ticketId: import("drizzle-orm/pg-core").PgColumn<{
            name: "ticket_id";
            tableName: "ingested_tickets";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 128;
        }>;
        payloadHash: import("drizzle-orm/pg-core").PgColumn<{
            name: "payload_hash";
            tableName: "ingested_tickets";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 64;
        }>;
        receipt: import("drizzle-orm/pg-core").PgColumn<{
            name: "receipt";
            tableName: "ingested_tickets";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        normalizedTicket: import("drizzle-orm/pg-core").PgColumn<{
            name: "normalized_ticket";
            tableName: "ingested_tickets";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "ingested_tickets";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const insertIngestedTicketSchema: z.ZodObject<{
    storageKey: z.ZodString;
    sourceId: z.ZodString;
    ticketId: z.ZodString;
    payloadHash: z.ZodString;
    receipt: z.ZodType<import("drizzle-zod").Json, unknown, z.core.$ZodTypeInternals<import("drizzle-zod").Json, unknown>>;
    normalizedTicket: z.ZodType<import("drizzle-zod").Json, unknown, z.core.$ZodTypeInternals<import("drizzle-zod").Json, unknown>>;
}, {
    out: {};
    in: {};
}>;
export type InsertIngestedTicket = z.infer<typeof insertIngestedTicketSchema>;
export type IngestedTicket = typeof ingestedTicketsTable.$inferSelect;
//# sourceMappingURL=ingested-tickets.d.ts.map