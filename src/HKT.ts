import { URIS2, Kind2 } from "fp-ts/lib/HKT";

export type ExtractHKTArgs2<K2> = K2 extends Kind2<URIS2, infer E, infer A> ? {E: E, A:A} : never;