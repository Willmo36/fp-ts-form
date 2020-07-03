import { Applicative2 } from 'fp-ts/lib/Applicative';
import { FunctionN } from 'fp-ts/lib/function';
import { Functor2 } from 'fp-ts/lib/Functor';
import * as O from 'fp-ts/lib/Option';
import { pipe, pipeable } from 'fp-ts/lib/pipeable';
import { Semigroup } from 'fp-ts/lib/Semigroup';
import { Lens } from 'monocle-ts';
import * as React from 'react';
import { monoidJSX } from './jsx';

/**
 * LIB TYPES
 */
export type UIResult = React.ReactElement;
export type ChangeCb<E> = FunctionN<[E], void>;

export type UI<E> = FunctionN<[ChangeCb<E>], UIResult>;

export type FormResult<E, A> = {
	ui: UI<E>;
	result: O.Option<A>;
};
export type Form<E, A> = FunctionN<[E], FormResult<E, A>>;

export const URI = 'Form' as const;
export type URI = typeof URI;

declare module 'fp-ts/lib/HKT' {
	interface URItoKind2<E, A> {
		Form: Form<E, A>;
	}
}

export const form: Functor2<URI> & Applicative2<URI> = {
	URI,
	of: (a) => (_input) => ({ ui: (_changeCb) => <></>, result: O.some(a) }),
	map: (form, f) => (input) => {
		const formResult = form(input);
		return {
			ui: formResult.ui,
			result: pipe(formResult.result, O.map(f))
		};
	},
	ap: (fab, fa) => (input) => {
		const ab = fab(input);
		const a = fa(input);
		const result = pipe(ab.result, O.ap(a.result));
		return {
			ui: (i) => (
				<>
					{ab.ui(i)}
					{a.ui(i)}
				</>
			),
			result
		};
	}
};

export function getSemigroup<E, A>(semigroupA: Semigroup<A>): Semigroup<Form<E, A>> {
	const monoidOptionA = O.getMonoid(semigroupA);
	return {
		concat(a, b) {
			return (i) => {
				const fra = a(i);
				const frb = b(i);

				const result = monoidOptionA.concat(fra.result, frb.result);
				const ui: UI<E> = (onchange) => monoidJSX.concat(fra.ui(onchange), frb.ui(onchange));

				return { result, ui };
			};
		}
	};
}

const { map, ap, apFirst, apSecond } = pipeable(form);
export { map, ap, apFirst, apSecond };

export function focus<E, E2>(lens: Lens<E, E2>) {
	return function <A>(form: Form<E2, A>): Form<E, A> {
		return (i) => {
			let { ui, result } = form(lens.get(i));
			return {
				result,
				ui: (onChange) =>
					ui((j) => {
						const i2 = lens.set(j)(i);
						return onChange(i2);
					})
			};
		};
	};
}

export function mapUI(f: (ui: React.ReactElement) => React.ReactElement) {
	return function <E, A>(form: Form<E, A>): Form<E, A> {
		return (input) => {
			const fr = form(input);
			return {
				result: fr.result,
				ui: (onchange) => f(fr.ui(onchange))
			};
		};
	};
}
