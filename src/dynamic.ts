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
	const monoidKBMap = M.getMonoid(ordK, semigroupB);
	const monoidABMapForm = F.getMonoid<Map<K, A>, Map<K, B>>(monoidKBMap);

	return (kaMap) => {
		const aMapBMapForm = pipe(
			kaMap,
			M.toArray(ordK),
			A.map(([key, aValue]) => {
				// Run the abForm with A to obtain B
				// Create a new Form which takes Map<K,A>
				// and has a prebuilt response of Map<K,B>

				const abFormResult = abForm(aValue);

				const ma_mb_form: F.Form<Map<K, A>, Map<K, B>> = (kaMap_) => ({
					result: pipe(
						abFormResult.result,
						O.map((b) => new Map([[key, b]]))
					),
					ui: (onchange) =>
						abFormResult.ui((nextAValue) => {
							const next = M.insertAt(ordK)(key, nextAValue)(kaMap_);
							onchange(next);
						})
				});

				return ma_mb_form;
			}),
			(forms) => forms.reduce(monoidABMapForm.concat, monoidABMapForm.empty)
		);

		return aMapBMapForm(kaMap);
	};
};
