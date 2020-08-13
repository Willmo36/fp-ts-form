import * as A from 'fp-ts/lib/Array';
import * as M from 'fp-ts/lib/Map';
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
				const abMapForm = pipe(
					abForm,
					F.map((bValue) => new Map([[key, bValue]]))
				);

				const formResult = abMapForm(aValue);

				const indexedForm: F.Form<Map<K, A>, Map<K, B>> = (i2) => ({
					result: formResult.result,
					ui: (onchange) =>
						formResult.ui((nextBValue) => {
							const next = M.insertAt(ordK)(key, nextBValue)(i2);
							onchange(next);
						})
				});

				return indexedForm;
			}),
			(forms) => forms.reduce(monoidABMapForm.concat, monoidABMapForm.empty)
		);

		return aMapBMapForm(kaMap);
	};
};
