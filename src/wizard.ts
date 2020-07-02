import { Applicative2 } from 'fp-ts/lib/Applicative';
import { Functor2 } from 'fp-ts/lib/Functor';
import { Monad2 } from 'fp-ts/lib/Monad';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { iso, Newtype } from 'newtype-ts';
import { ExtractHKTArgs2 } from './HKT';
import * as F from './index';
import { monoidJSX } from './jsx';

export interface Wizard<E, A> extends Newtype<{ readonly Wizard: unique symbol }, F.Form<E, A>> {}

export const URI = 'Wizard';
export type URI = typeof URI;
declare module 'fp-ts/lib/HKT' {
	interface URItoKind2<E, A> {
		Wizard: Wizard<E, A>;
	}
}

const getIsoWizard = <I, A>() => iso<Wizard<I, A>>();
export const step = <E, A>(form: F.Form<E, A>): Wizard<E, A> => getIsoWizard<E, A>().wrap(form);
export const wizard = <E, A>(wiz: Wizard<E, A>): F.Form<E, A> => getIsoWizard<E, A>().unwrap(wiz);

export const wizard_: Functor2<URI> & Applicative2<URI> & Monad2<URI> = {
	URI,
	of: (a) => step(F.form.of(a)),
	map: (fa, f) => step(F.form.map(wizard(fa), f)),
	ap: (fab, fa) => {
		type FAB = ExtractHKTArgs2<typeof fab>;

		const formAB = wizard(fab);
		const formA = wizard(fa);

		const formB = (input: FAB['E']) => {
			const ab = formAB(input);
			const a = formA(input);

			const b = pipe(ab.result, O.ap(a.result));

			return {
				ui: (i: F.ChangeCb<FAB['E']>) => monoidJSX.concat(ab.ui(i), a.ui(i)),
				result: b
			};
		};

		return step(formB);
	},
	chain: (fa, f) => {
		type FA = ExtractHKTArgs2<typeof fa>;
		type FB = ExtractHKTArgs2<ReturnType<typeof f>>;

		const emptyFormB: F.Form<FA['E'], FB['A']> = (_input) => ({
			ui: (_) => monoidJSX.empty,
			result: O.none
		});

		const formB: F.Form<FA['E'], FB['A']> = (input) => {
			const a = wizard(fa)(input);
			const fb = pipe(
				a.result,
				O.fold(
					() => emptyFormB,
					(a) => wizard(f(a))
				)
			);

			const b = fb(input);
			const ui: F.UI<FA['E']> = (onchange) => {
				const aUI = a.ui(onchange);
				const bUI = b.ui(onchange);
				return monoidJSX.concat(aUI, bUI);
			};

			return {
				ui,
				result: b.result
			};
		};

		return step(formB);
	}
};
