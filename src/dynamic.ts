import * as A from 'fp-ts/lib/Array';
import * as M from 'fp-ts/lib/Map';
import * as O from 'fp-ts/lib/Option';
import { Ord } from 'fp-ts/lib/Ord';
import { pipe } from 'fp-ts/lib/pipeable';
import { Semigroup } from 'fp-ts/lib/Semigroup';
import * as F from './Form';

export const multiform = <K, A, B>(
	ordK: Ord<K>,
	semigroupB: Semigroup<B>,
	abForm: F.Form<A, B>
): F.Form<Map<K, A>, Map<K, B>> => {
	const monoidMapB = M.getMonoid(ordK, semigroupB);
	const monoidABMapForm = F.getMonoid<Map<K, A>, Map<K, B>>(monoidMapB);

	return (ma) => {
		const ma_mb_form = pipe(
			ma,
			M.toArray(ordK),
			A.map(([key, aValue]) => {
				// Run the abForm with A to obtain B
				// Create a new Form which takes Map<K,A>
				// and has a prebuilt response of Map<K,B>

				const ab_form_result = abForm(aValue);

				const ma_mb_form: F.Form<Map<K, A>, Map<K, B>> = (ma_next) => ({
					result: pipe(
						ab_form_result.result,
                        O.map((b) => new Map([[key, b]])),
                        O.alt(() => O.some(new Map()))
					),
					ui: (onchange) =>
						ab_form_result.ui((nextAValue) => {
                            const next = M.insertAt(ordK)(key, nextAValue)(ma_next);
							onchange(next);
						})
				});

				return ma_mb_form;
			}),
			(forms) => forms.reduce(monoidABMapForm.concat, monoidABMapForm.empty)
		);

		return ma_mb_form(ma);
	};
};
