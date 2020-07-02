import * as F from './';
import { FunctionN } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import * as O from 'fp-ts/lib/Option';
import * as E from 'fp-ts/lib/Either';

export type Validator<E, A> = FunctionN<[E], E.Either<string, A>>;

export type Validated<E> = { value: E; modified: boolean };
export function fresh<E>(i: E): Validated<E> {
	return { value: i, modified: false };
}
export function modified<E>(i: E): Validated<E> {
	return { value: i, modified: true };
}

export function validated<E, B>(
	validator: Validator<E, B>,
	renderWithError: (err: string, ui: F.UIResult) => F.UIResult
) {
	return function <A>(form: F.Form<E, A>): F.Form<Validated<E>, B> {
		return (validatedInput) => {
			const fr = form(validatedInput.value);
			const err = validator(validatedInput.value);

			return {
				ui: (onchange) => {
					const ui2 = fr.ui((input) => onchange(modified(input)));
					return pipe(
						err,
						E.fold(
							(errStr) => (validatedInput.modified ? renderWithError(errStr, ui2) : ui2),
							() => ui2
						)
					);
				},
				result: O.fromEither(err)
			};
		};
	};
}
