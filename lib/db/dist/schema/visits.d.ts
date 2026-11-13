import { z } from "zod/v4";
export declare const visitsTable: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "visits";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "visits";
            dataType: "number";
            columnType: "PgSerial";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        visitorId: import("drizzle-orm/pg-core").PgColumn<{
            name: "visitor_id";
            tableName: "visits";
            dataType: "string";
            columnType: "PgText";
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
        }, {}, {}>;
        visitDate: import("drizzle-orm/pg-core").PgColumn<{
            name: "visit_date";
            tableName: "visits";
            dataType: "string";
            columnType: "PgDateString";
            data: string;
            driverParam: string;
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
        source: import("drizzle-orm/pg-core").PgColumn<{
            name: "source";
            tableName: "visits";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "visits";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
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
export declare const insertVisitSchema: z.ZodObject<{
    visitorId: z.ZodString;
    visitDate: z.ZodString;
    source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, {
    out: {};
    in: {};
}>;
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visitsTable.$inferSelect;
//# sourceMappingURL=visits.d.ts.map