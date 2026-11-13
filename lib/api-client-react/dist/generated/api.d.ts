import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { ActivityItem, AdCreative, AdEventInput, AdInput, AdServePayload, AdUpdate, AdWithStats, ApiMessage, ChatInput, ChatReply, CheckoutInput, CheckoutSession, CommandCenter, DashboardSummary, GetZetaTicketParams, HealthStatus, Insight, ListReceiptsParams, ListZetaTicketsParams, PayoutOnboardBody, PayoutOnboardResponse, PayoutStatus, Receipt, ReceiptInput, ReviewDecision, ReviewQueue, SearchReceiptsParams, SearchResults, ServeAdParams, SettlementPause, SettlementPauseState, SubscriptionStatus, TicketIngestionError, TicketIngestionInput, TicketIngestionResult, Tier, UserProfile, VisitPing, WithdrawBody, WithdrawResponse, ZetaOverview, ZetaTicketDetail, ZetaTicketPage, ZodiacProfileInput } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getIngestTicketUrl: () => string;
/**
 * Authenticates machine credentials using either an API key or bearer token.
 * @summary Ingest a ZETA AltData ticket
 */
export declare const ingestTicket: (ticketIngestionInput: TicketIngestionInput, options?: RequestInit) => Promise<TicketIngestionResult>;
export declare const getIngestTicketMutationOptions: <TError = ErrorType<TicketIngestionError | ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof ingestTicket>>, TError, {
        data: BodyType<TicketIngestionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof ingestTicket>>, TError, {
    data: BodyType<TicketIngestionInput>;
}, TContext>;
export type IngestTicketMutationResult = NonNullable<Awaited<ReturnType<typeof ingestTicket>>>;
export type IngestTicketMutationBody = BodyType<TicketIngestionInput>;
export type IngestTicketMutationError = ErrorType<TicketIngestionError | ApiMessage>;
/**
* @summary Ingest a ZETA AltData ticket
*/
export declare const useIngestTicket: <TError = ErrorType<TicketIngestionError | ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof ingestTicket>>, TError, {
        data: BodyType<TicketIngestionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof ingestTicket>>, TError, {
    data: BodyType<TicketIngestionInput>;
}, TContext>;
export declare const getGetMeUrl: () => string;
/**
 * @summary Get current user profile
 */
export declare const getMe: (options?: RequestInit) => Promise<UserProfile>;
export declare const getGetMeQueryKey: () => readonly ["/api/me"];
export declare const getGetMeQueryOptions: <TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMeQueryResult = NonNullable<Awaited<ReturnType<typeof getMe>>>;
export type GetMeQueryError = ErrorType<unknown>;
/**
 * @summary Get current user profile
 */
export declare function useGetMe<TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAcceptTermsUrl: () => string;
/**
 * @summary Record the user's acceptance of the Terms & Conditions
 */
export declare const acceptTerms: (options?: RequestInit) => Promise<UserProfile>;
export declare const getAcceptTermsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof acceptTerms>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof acceptTerms>>, TError, void, TContext>;
export type AcceptTermsMutationResult = NonNullable<Awaited<ReturnType<typeof acceptTerms>>>;
export type AcceptTermsMutationError = ErrorType<unknown>;
/**
* @summary Record the user's acceptance of the Terms & Conditions
*/
export declare const useAcceptTerms: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof acceptTerms>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof acceptTerms>>, TError, void, TContext>;
export declare const getUpdateZodiacUrl: () => string;
/**
 * @summary Set the Starting 5 zodiac profile
 */
export declare const updateZodiac: (zodiacProfileInput: ZodiacProfileInput, options?: RequestInit) => Promise<UserProfile>;
export declare const getUpdateZodiacMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateZodiac>>, TError, {
        data: BodyType<ZodiacProfileInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateZodiac>>, TError, {
    data: BodyType<ZodiacProfileInput>;
}, TContext>;
export type UpdateZodiacMutationResult = NonNullable<Awaited<ReturnType<typeof updateZodiac>>>;
export type UpdateZodiacMutationBody = BodyType<ZodiacProfileInput>;
export type UpdateZodiacMutationError = ErrorType<unknown>;
/**
* @summary Set the Starting 5 zodiac profile
*/
export declare const useUpdateZodiac: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateZodiac>>, TError, {
        data: BodyType<ZodiacProfileInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateZodiac>>, TError, {
    data: BodyType<ZodiacProfileInput>;
}, TContext>;
export declare const getListReceiptsUrl: (params?: ListReceiptsParams) => string;
/**
 * @summary List the current user's receipts
 */
export declare const listReceipts: (params?: ListReceiptsParams, options?: RequestInit) => Promise<Receipt[]>;
export declare const getListReceiptsQueryKey: (params?: ListReceiptsParams) => readonly ["/api/receipts", ...ListReceiptsParams[]];
export declare const getListReceiptsQueryOptions: <TData = Awaited<ReturnType<typeof listReceipts>>, TError = ErrorType<unknown>>(params?: ListReceiptsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listReceipts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listReceipts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListReceiptsQueryResult = NonNullable<Awaited<ReturnType<typeof listReceipts>>>;
export type ListReceiptsQueryError = ErrorType<unknown>;
/**
 * @summary List the current user's receipts
 */
export declare function useListReceipts<TData = Awaited<ReturnType<typeof listReceipts>>, TError = ErrorType<unknown>>(params?: ListReceiptsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listReceipts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateReceiptUrl: () => string;
/**
 * @summary Submit a near-miss parlay receipt
 */
export declare const createReceipt: (receiptInput: ReceiptInput, options?: RequestInit) => Promise<Receipt>;
export declare const getCreateReceiptMutationOptions: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createReceipt>>, TError, {
        data: BodyType<ReceiptInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createReceipt>>, TError, {
    data: BodyType<ReceiptInput>;
}, TContext>;
export type CreateReceiptMutationResult = NonNullable<Awaited<ReturnType<typeof createReceipt>>>;
export type CreateReceiptMutationBody = BodyType<ReceiptInput>;
export type CreateReceiptMutationError = ErrorType<ApiMessage>;
/**
* @summary Submit a near-miss parlay receipt
*/
export declare const useCreateReceipt: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createReceipt>>, TError, {
        data: BodyType<ReceiptInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createReceipt>>, TError, {
    data: BodyType<ReceiptInput>;
}, TContext>;
export declare const getGetReceiptUrl: (id: number) => string;
/**
 * @summary Get a receipt by id
 */
export declare const getReceipt: (id: number, options?: RequestInit) => Promise<Receipt>;
export declare const getGetReceiptQueryKey: (id: number) => readonly [`/api/receipts/${number}`];
export declare const getGetReceiptQueryOptions: <TData = Awaited<ReturnType<typeof getReceipt>>, TError = ErrorType<ApiMessage>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getReceipt>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getReceipt>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetReceiptQueryResult = NonNullable<Awaited<ReturnType<typeof getReceipt>>>;
export type GetReceiptQueryError = ErrorType<ApiMessage>;
/**
 * @summary Get a receipt by id
 */
export declare function useGetReceipt<TData = Awaited<ReturnType<typeof getReceipt>>, TError = ErrorType<ApiMessage>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getReceipt>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSettleReceiptUrl: (id: number) => string;
/**
 * @summary Run settlement on a verified receipt (consumes a daily attempt)
 */
export declare const settleReceipt: (id: number, options?: RequestInit) => Promise<Receipt>;
export declare const getSettleReceiptMutationOptions: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof settleReceipt>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof settleReceipt>>, TError, {
    id: number;
}, TContext>;
export type SettleReceiptMutationResult = NonNullable<Awaited<ReturnType<typeof settleReceipt>>>;
export type SettleReceiptMutationError = ErrorType<ApiMessage>;
/**
* @summary Run settlement on a verified receipt (consumes a daily attempt)
*/
export declare const useSettleReceipt: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof settleReceipt>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof settleReceipt>>, TError, {
    id: number;
}, TContext>;
export declare const getGetPayoutStatusUrl: () => string;
/**
 * @summary Current user's payout account status
 */
export declare const getPayoutStatus: (options?: RequestInit) => Promise<PayoutStatus>;
export declare const getGetPayoutStatusQueryKey: () => readonly ["/api/payouts/status"];
export declare const getGetPayoutStatusQueryOptions: <TData = Awaited<ReturnType<typeof getPayoutStatus>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPayoutStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPayoutStatus>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPayoutStatusQueryResult = NonNullable<Awaited<ReturnType<typeof getPayoutStatus>>>;
export type GetPayoutStatusQueryError = ErrorType<unknown>;
/**
 * @summary Current user's payout account status
 */
export declare function useGetPayoutStatus<TData = Awaited<ReturnType<typeof getPayoutStatus>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPayoutStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getOnboardPayoutsUrl: () => string;
/**
 * @summary Create (or resume) Stripe Connect onboarding for cash payouts
 */
export declare const onboardPayouts: (payoutOnboardBody: PayoutOnboardBody, options?: RequestInit) => Promise<PayoutOnboardResponse>;
export declare const getOnboardPayoutsMutationOptions: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof onboardPayouts>>, TError, {
        data: BodyType<PayoutOnboardBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof onboardPayouts>>, TError, {
    data: BodyType<PayoutOnboardBody>;
}, TContext>;
export type OnboardPayoutsMutationResult = NonNullable<Awaited<ReturnType<typeof onboardPayouts>>>;
export type OnboardPayoutsMutationBody = BodyType<PayoutOnboardBody>;
export type OnboardPayoutsMutationError = ErrorType<ApiMessage>;
/**
* @summary Create (or resume) Stripe Connect onboarding for cash payouts
*/
export declare const useOnboardPayouts: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof onboardPayouts>>, TError, {
        data: BodyType<PayoutOnboardBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof onboardPayouts>>, TError, {
    data: BodyType<PayoutOnboardBody>;
}, TContext>;
export declare const getWithdrawPayoutUrl: () => string;
/**
 * @summary Withdraw settled balance as a real cash transfer
 */
export declare const withdrawPayout: (withdrawBody: WithdrawBody, options?: RequestInit) => Promise<WithdrawResponse>;
export declare const getWithdrawPayoutMutationOptions: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof withdrawPayout>>, TError, {
        data: BodyType<WithdrawBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof withdrawPayout>>, TError, {
    data: BodyType<WithdrawBody>;
}, TContext>;
export type WithdrawPayoutMutationResult = NonNullable<Awaited<ReturnType<typeof withdrawPayout>>>;
export type WithdrawPayoutMutationBody = BodyType<WithdrawBody>;
export type WithdrawPayoutMutationError = ErrorType<ApiMessage>;
/**
* @summary Withdraw settled balance as a real cash transfer
*/
export declare const useWithdrawPayout: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof withdrawPayout>>, TError, {
        data: BodyType<WithdrawBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof withdrawPayout>>, TError, {
    data: BodyType<WithdrawBody>;
}, TContext>;
export declare const getSearchReceiptsUrl: (params?: SearchReceiptsParams) => string;
/**
 * @summary Refined search across the user's receipts
 */
export declare const searchReceipts: (params?: SearchReceiptsParams, options?: RequestInit) => Promise<SearchResults>;
export declare const getSearchReceiptsQueryKey: (params?: SearchReceiptsParams) => readonly ["/api/search", ...SearchReceiptsParams[]];
export declare const getSearchReceiptsQueryOptions: <TData = Awaited<ReturnType<typeof searchReceipts>>, TError = ErrorType<unknown>>(params?: SearchReceiptsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof searchReceipts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof searchReceipts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type SearchReceiptsQueryResult = NonNullable<Awaited<ReturnType<typeof searchReceipts>>>;
export type SearchReceiptsQueryError = ErrorType<unknown>;
/**
 * @summary Refined search across the user's receipts
 */
export declare function useSearchReceipts<TData = Awaited<ReturnType<typeof searchReceipts>>, TError = ErrorType<unknown>>(params?: SearchReceiptsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof searchReceipts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetDashboardSummaryUrl: () => string;
/**
 * @summary Clearinghouse dashboard summary for the current user
 */
export declare const getDashboardSummary: (options?: RequestInit) => Promise<DashboardSummary>;
export declare const getGetDashboardSummaryQueryKey: () => readonly ["/api/dashboard/summary"];
export declare const getGetDashboardSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardSummary>>>;
export type GetDashboardSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Clearinghouse dashboard summary for the current user
 */
export declare function useGetDashboardSummary<TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetActivityUrl: () => string;
/**
 * @summary Recent activity feed for the current user
 */
export declare const getActivity: (options?: RequestInit) => Promise<ActivityItem[]>;
export declare const getGetActivityQueryKey: () => readonly ["/api/activity"];
export declare const getGetActivityQueryOptions: <TData = Awaited<ReturnType<typeof getActivity>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getActivity>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetActivityQueryResult = NonNullable<Awaited<ReturnType<typeof getActivity>>>;
export type GetActivityQueryError = ErrorType<unknown>;
/**
 * @summary Recent activity feed for the current user
 */
export declare function useGetActivity<TData = Awaited<ReturnType<typeof getActivity>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListTiersUrl: () => string;
/**
 * @summary List settlement tiers
 */
export declare const listTiers: (options?: RequestInit) => Promise<Tier[]>;
export declare const getListTiersQueryKey: () => readonly ["/api/tiers"];
export declare const getListTiersQueryOptions: <TData = Awaited<ReturnType<typeof listTiers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTiers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTiers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTiersQueryResult = NonNullable<Awaited<ReturnType<typeof listTiers>>>;
export type ListTiersQueryError = ErrorType<unknown>;
/**
 * @summary List settlement tiers
 */
export declare function useListTiers<TData = Awaited<ReturnType<typeof listTiers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTiers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateCheckoutUrl: () => string;
/**
 * @summary Create a Whop hosted checkout session for a tier
 */
export declare const createCheckout: (checkoutInput: CheckoutInput, options?: RequestInit) => Promise<CheckoutSession>;
export declare const getCreateCheckoutMutationOptions: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCheckout>>, TError, {
        data: BodyType<CheckoutInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCheckout>>, TError, {
    data: BodyType<CheckoutInput>;
}, TContext>;
export type CreateCheckoutMutationResult = NonNullable<Awaited<ReturnType<typeof createCheckout>>>;
export type CreateCheckoutMutationBody = BodyType<CheckoutInput>;
export type CreateCheckoutMutationError = ErrorType<ApiMessage>;
/**
* @summary Create a Whop hosted checkout session for a tier
*/
export declare const useCreateCheckout: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCheckout>>, TError, {
        data: BodyType<CheckoutInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCheckout>>, TError, {
    data: BodyType<CheckoutInput>;
}, TContext>;
export declare const getGetSubscriptionUrl: () => string;
/**
 * @summary Get the current user's verified subscription status
 */
export declare const getSubscription: (options?: RequestInit) => Promise<SubscriptionStatus>;
export declare const getGetSubscriptionQueryKey: () => readonly ["/api/whop/subscription"];
export declare const getGetSubscriptionQueryOptions: <TData = Awaited<ReturnType<typeof getSubscription>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSubscription>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSubscription>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSubscriptionQueryResult = NonNullable<Awaited<ReturnType<typeof getSubscription>>>;
export type GetSubscriptionQueryError = ErrorType<unknown>;
/**
 * @summary Get the current user's verified subscription status
 */
export declare function useGetSubscription<TData = Awaited<ReturnType<typeof getSubscription>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSubscription>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSyncSubscriptionUrl: () => string;
/**
 * @summary Re-verify subscription with Whop after checkout redirect
 */
export declare const syncSubscription: (options?: RequestInit) => Promise<SubscriptionStatus>;
export declare const getSyncSubscriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof syncSubscription>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof syncSubscription>>, TError, void, TContext>;
export type SyncSubscriptionMutationResult = NonNullable<Awaited<ReturnType<typeof syncSubscription>>>;
export type SyncSubscriptionMutationError = ErrorType<unknown>;
/**
* @summary Re-verify subscription with Whop after checkout redirect
*/
export declare const useSyncSubscription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof syncSubscription>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof syncSubscription>>, TError, void, TContext>;
export declare const getChatWithRoqqetUrl: () => string;
/**
 * @summary Chat with R0QQ3T, the Agentic Zodiac Systems Assistant
 */
export declare const chatWithRoqqet: (chatInput: ChatInput, options?: RequestInit) => Promise<ChatReply>;
export declare const getChatWithRoqqetMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof chatWithRoqqet>>, TError, {
        data: BodyType<ChatInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof chatWithRoqqet>>, TError, {
    data: BodyType<ChatInput>;
}, TContext>;
export type ChatWithRoqqetMutationResult = NonNullable<Awaited<ReturnType<typeof chatWithRoqqet>>>;
export type ChatWithRoqqetMutationBody = BodyType<ChatInput>;
export type ChatWithRoqqetMutationError = ErrorType<unknown>;
/**
* @summary Chat with R0QQ3T, the Agentic Zodiac Systems Assistant
*/
export declare const useChatWithRoqqet: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof chatWithRoqqet>>, TError, {
        data: BodyType<ChatInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof chatWithRoqqet>>, TError, {
    data: BodyType<ChatInput>;
}, TContext>;
export declare const getGetDailyInsightUrl: () => string;
/**
 * @summary Daily zodiac-tuned insight from R0QQ3T
 */
export declare const getDailyInsight: (options?: RequestInit) => Promise<Insight>;
export declare const getGetDailyInsightQueryKey: () => readonly ["/api/roqqet/insight"];
export declare const getGetDailyInsightQueryOptions: <TData = Awaited<ReturnType<typeof getDailyInsight>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDailyInsight>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDailyInsight>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDailyInsightQueryResult = NonNullable<Awaited<ReturnType<typeof getDailyInsight>>>;
export type GetDailyInsightQueryError = ErrorType<unknown>;
/**
 * @summary Daily zodiac-tuned insight from R0QQ3T
 */
export declare function useGetDailyInsight<TData = Awaited<ReturnType<typeof getDailyInsight>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDailyInsight>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getTrackVisitUrl: () => string;
/**
 * @summary Record an anonymous unique-visitor ping
 */
export declare const trackVisit: (visitPing: VisitPing, options?: RequestInit) => Promise<void>;
export declare const getTrackVisitMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof trackVisit>>, TError, {
        data: BodyType<VisitPing>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof trackVisit>>, TError, {
    data: BodyType<VisitPing>;
}, TContext>;
export type TrackVisitMutationResult = NonNullable<Awaited<ReturnType<typeof trackVisit>>>;
export type TrackVisitMutationBody = BodyType<VisitPing>;
export type TrackVisitMutationError = ErrorType<unknown>;
/**
* @summary Record an anonymous unique-visitor ping
*/
export declare const useTrackVisit: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof trackVisit>>, TError, {
        data: BodyType<VisitPing>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof trackVisit>>, TError, {
    data: BodyType<VisitPing>;
}, TContext>;
export declare const getServeAdUrl: (params: ServeAdParams) => string;
/**
 * @summary Serve an ad creative for a placement (house/affiliate or network scaffold)
 */
export declare const serveAd: (params: ServeAdParams, options?: RequestInit) => Promise<AdServePayload>;
export declare const getServeAdQueryKey: (params?: ServeAdParams) => readonly ["/api/ads/serve", ...ServeAdParams[]];
export declare const getServeAdQueryOptions: <TData = Awaited<ReturnType<typeof serveAd>>, TError = ErrorType<unknown>>(params: ServeAdParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof serveAd>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof serveAd>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ServeAdQueryResult = NonNullable<Awaited<ReturnType<typeof serveAd>>>;
export type ServeAdQueryError = ErrorType<unknown>;
/**
 * @summary Serve an ad creative for a placement (house/affiliate or network scaffold)
 */
export declare function useServeAd<TData = Awaited<ReturnType<typeof serveAd>>, TError = ErrorType<unknown>>(params: ServeAdParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof serveAd>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getRecordAdEventUrl: (id: number) => string;
/**
 * @summary Record an ad impression or click
 */
export declare const recordAdEvent: (id: number, adEventInput: AdEventInput, options?: RequestInit) => Promise<void>;
export declare const getRecordAdEventMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof recordAdEvent>>, TError, {
        id: number;
        data: BodyType<AdEventInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof recordAdEvent>>, TError, {
    id: number;
    data: BodyType<AdEventInput>;
}, TContext>;
export type RecordAdEventMutationResult = NonNullable<Awaited<ReturnType<typeof recordAdEvent>>>;
export type RecordAdEventMutationBody = BodyType<AdEventInput>;
export type RecordAdEventMutationError = ErrorType<unknown>;
/**
* @summary Record an ad impression or click
*/
export declare const useRecordAdEvent: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof recordAdEvent>>, TError, {
        id: number;
        data: BodyType<AdEventInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof recordAdEvent>>, TError, {
    id: number;
    data: BodyType<AdEventInput>;
}, TContext>;
export declare const getListAdsUrl: () => string;
/**
 * @summary List all ad creatives with performance stats
 */
export declare const listAds: (options?: RequestInit) => Promise<AdWithStats[]>;
export declare const getListAdsQueryKey: () => readonly ["/api/admin/ads"];
export declare const getListAdsQueryOptions: <TData = Awaited<ReturnType<typeof listAds>>, TError = ErrorType<ApiMessage>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAds>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAds>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAdsQueryResult = NonNullable<Awaited<ReturnType<typeof listAds>>>;
export type ListAdsQueryError = ErrorType<ApiMessage>;
/**
 * @summary List all ad creatives with performance stats
 */
export declare function useListAds<TData = Awaited<ReturnType<typeof listAds>>, TError = ErrorType<ApiMessage>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAds>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateAdUrl: () => string;
/**
 * @summary Create an ad creative
 */
export declare const createAd: (adInput: AdInput, options?: RequestInit) => Promise<AdCreative>;
export declare const getCreateAdMutationOptions: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAd>>, TError, {
        data: BodyType<AdInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAd>>, TError, {
    data: BodyType<AdInput>;
}, TContext>;
export type CreateAdMutationResult = NonNullable<Awaited<ReturnType<typeof createAd>>>;
export type CreateAdMutationBody = BodyType<AdInput>;
export type CreateAdMutationError = ErrorType<ApiMessage>;
/**
* @summary Create an ad creative
*/
export declare const useCreateAd: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAd>>, TError, {
        data: BodyType<AdInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAd>>, TError, {
    data: BodyType<AdInput>;
}, TContext>;
export declare const getUpdateAdUrl: (id: number) => string;
/**
 * @summary Update an ad creative (partial)
 */
export declare const updateAd: (id: number, adUpdate: AdUpdate, options?: RequestInit) => Promise<AdCreative>;
export declare const getUpdateAdMutationOptions: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAd>>, TError, {
        id: number;
        data: BodyType<AdUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAd>>, TError, {
    id: number;
    data: BodyType<AdUpdate>;
}, TContext>;
export type UpdateAdMutationResult = NonNullable<Awaited<ReturnType<typeof updateAd>>>;
export type UpdateAdMutationBody = BodyType<AdUpdate>;
export type UpdateAdMutationError = ErrorType<ApiMessage>;
/**
* @summary Update an ad creative (partial)
*/
export declare const useUpdateAd: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAd>>, TError, {
        id: number;
        data: BodyType<AdUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAd>>, TError, {
    id: number;
    data: BodyType<AdUpdate>;
}, TContext>;
export declare const getGetCommandCenterUrl: () => string;
/**
 * @summary Operator command center metrics
 */
export declare const getCommandCenter: (options?: RequestInit) => Promise<CommandCenter>;
export declare const getGetCommandCenterQueryKey: () => readonly ["/api/admin/command-center"];
export declare const getGetCommandCenterQueryOptions: <TData = Awaited<ReturnType<typeof getCommandCenter>>, TError = ErrorType<ApiMessage>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCommandCenter>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCommandCenter>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCommandCenterQueryResult = NonNullable<Awaited<ReturnType<typeof getCommandCenter>>>;
export type GetCommandCenterQueryError = ErrorType<ApiMessage>;
/**
 * @summary Operator command center metrics
 */
export declare function useGetCommandCenter<TData = Awaited<ReturnType<typeof getCommandCenter>>, TError = ErrorType<ApiMessage>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCommandCenter>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSetSettlementPauseUrl: () => string;
/**
 * @summary Pause or resume all automatic settlements
 */
export declare const setSettlementPause: (settlementPause: SettlementPause, options?: RequestInit) => Promise<SettlementPauseState>;
export declare const getSetSettlementPauseMutationOptions: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setSettlementPause>>, TError, {
        data: BodyType<SettlementPause>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof setSettlementPause>>, TError, {
    data: BodyType<SettlementPause>;
}, TContext>;
export type SetSettlementPauseMutationResult = NonNullable<Awaited<ReturnType<typeof setSettlementPause>>>;
export type SetSettlementPauseMutationBody = BodyType<SettlementPause>;
export type SetSettlementPauseMutationError = ErrorType<ApiMessage>;
/**
* @summary Pause or resume all automatic settlements
*/
export declare const useSetSettlementPause: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setSettlementPause>>, TError, {
        data: BodyType<SettlementPause>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof setSettlementPause>>, TError, {
    data: BodyType<SettlementPause>;
}, TContext>;
export declare const getGetReviewQueueUrl: () => string;
/**
 * @summary Receipts held for operator integrity review
 */
export declare const getReviewQueue: (options?: RequestInit) => Promise<ReviewQueue>;
export declare const getGetReviewQueueQueryKey: () => readonly ["/api/admin/review-queue"];
export declare const getGetReviewQueueQueryOptions: <TData = Awaited<ReturnType<typeof getReviewQueue>>, TError = ErrorType<ApiMessage>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getReviewQueue>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getReviewQueue>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetReviewQueueQueryResult = NonNullable<Awaited<ReturnType<typeof getReviewQueue>>>;
export type GetReviewQueueQueryError = ErrorType<ApiMessage>;
/**
 * @summary Receipts held for operator integrity review
 */
export declare function useGetReviewQueue<TData = Awaited<ReturnType<typeof getReviewQueue>>, TError = ErrorType<ApiMessage>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getReviewQueue>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getReviewReceiptUrl: (id: number) => string;
/**
 * @summary Approve or reject a receipt held for review
 */
export declare const reviewReceipt: (id: number, reviewDecision: ReviewDecision, options?: RequestInit) => Promise<Receipt>;
export declare const getReviewReceiptMutationOptions: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof reviewReceipt>>, TError, {
        id: number;
        data: BodyType<ReviewDecision>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof reviewReceipt>>, TError, {
    id: number;
    data: BodyType<ReviewDecision>;
}, TContext>;
export type ReviewReceiptMutationResult = NonNullable<Awaited<ReturnType<typeof reviewReceipt>>>;
export type ReviewReceiptMutationBody = BodyType<ReviewDecision>;
export type ReviewReceiptMutationError = ErrorType<ApiMessage>;
/**
* @summary Approve or reject a receipt held for review
*/
export declare const useReviewReceipt: <TError = ErrorType<ApiMessage>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof reviewReceipt>>, TError, {
        id: number;
        data: BodyType<ReviewDecision>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof reviewReceipt>>, TError, {
    id: number;
    data: BodyType<ReviewDecision>;
}, TContext>;
export declare const getGetZetaOverviewUrl: () => string;
/**
 * @summary Read-only ZETA ingestion overview
 */
export declare const getZetaOverview: (options?: RequestInit) => Promise<ZetaOverview>;
export declare const getGetZetaOverviewQueryKey: () => readonly ["/api/admin/zeta/overview"];
export declare const getGetZetaOverviewQueryOptions: <TData = Awaited<ReturnType<typeof getZetaOverview>>, TError = ErrorType<ApiMessage>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getZetaOverview>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getZetaOverview>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetZetaOverviewQueryResult = NonNullable<Awaited<ReturnType<typeof getZetaOverview>>>;
export type GetZetaOverviewQueryError = ErrorType<ApiMessage>;
/**
 * @summary Read-only ZETA ingestion overview
 */
export declare function useGetZetaOverview<TData = Awaited<ReturnType<typeof getZetaOverview>>, TError = ErrorType<ApiMessage>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getZetaOverview>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListZetaTicketsUrl: (params?: ListZetaTicketsParams) => string;
/**
 * @summary List persisted ZETA tickets
 */
export declare const listZetaTickets: (params?: ListZetaTicketsParams, options?: RequestInit) => Promise<ZetaTicketPage>;
export declare const getListZetaTicketsQueryKey: (params?: ListZetaTicketsParams) => readonly ["/api/admin/zeta/tickets", ...ListZetaTicketsParams[]];
export declare const getListZetaTicketsQueryOptions: <TData = Awaited<ReturnType<typeof listZetaTickets>>, TError = ErrorType<ApiMessage>>(params?: ListZetaTicketsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listZetaTickets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listZetaTickets>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListZetaTicketsQueryResult = NonNullable<Awaited<ReturnType<typeof listZetaTickets>>>;
export type ListZetaTicketsQueryError = ErrorType<ApiMessage>;
/**
 * @summary List persisted ZETA tickets
 */
export declare function useListZetaTickets<TData = Awaited<ReturnType<typeof listZetaTickets>>, TError = ErrorType<ApiMessage>>(params?: ListZetaTicketsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listZetaTickets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetZetaTicketUrl: (params: GetZetaTicketParams) => string;
/**
 * @summary Get one persisted ZETA ticket
 */
export declare const getZetaTicket: (params: GetZetaTicketParams, options?: RequestInit) => Promise<ZetaTicketDetail>;
export declare const getGetZetaTicketQueryKey: (params?: GetZetaTicketParams) => readonly ["/api/admin/zeta/ticket", ...GetZetaTicketParams[]];
export declare const getGetZetaTicketQueryOptions: <TData = Awaited<ReturnType<typeof getZetaTicket>>, TError = ErrorType<ApiMessage>>(params: GetZetaTicketParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getZetaTicket>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getZetaTicket>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetZetaTicketQueryResult = NonNullable<Awaited<ReturnType<typeof getZetaTicket>>>;
export type GetZetaTicketQueryError = ErrorType<ApiMessage>;
/**
 * @summary Get one persisted ZETA ticket
 */
export declare function useGetZetaTicket<TData = Awaited<ReturnType<typeof getZetaTicket>>, TError = ErrorType<ApiMessage>>(params: GetZetaTicketParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getZetaTicket>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map