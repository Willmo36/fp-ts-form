import { Applicative2 } from "fp-ts/lib/Applicative";
import { Either, fold } from "fp-ts/lib/Either";
import { FunctionN } from "fp-ts/lib/function";
import { Functor2 } from "fp-ts/lib/Functor";
import * as O from "fp-ts/lib/Option";
import { pipe, pipeable } from "fp-ts/lib/pipeable";
import { Lens } from "monocle-ts";
import * as React from "react";

/**
 * LIB TYPES
 */
type UIResult = React.ReactElement; //will be React
export type ChangeCb<E> = FunctionN<[E], void>;

export type UI<E> = FunctionN<[ChangeCb<E>], UIResult>

export type FormResult<E, A> = {
  ui: UI<E>;
  result: O.Option<A>;
};
export type Form<E, A> = FunctionN<[E], FormResult<E, A>>;

export const URI = "Form" as const;
export type URI = typeof URI;

declare module "fp-ts/lib/HKT" {
  interface URItoKind2<E, A> {
    Form: Form<E, A>;
  }
}

export const form: Functor2<URI> & Applicative2<URI> = {
  URI,
  of: (a) => (_input) => ({ ui: (_changeCb) => (<></>), result: O.some(a) }),
  map: (form, f) => (input) => {
    const formResult = form(input);
    return {
      ui: formResult.ui,
      result: pipe(formResult.result, O.map(f)),
    };
  },
  ap: (fab, fa) => (input) => {
    const ab = fab(input);
    const a = fa(input);
    const result = pipe(ab.result, O.ap(a.result));
    return {
      ui: i => (
          <>
            {ab.ui(i)}
            {a.ui(i)}
          </>
      ),
      result,
    };
  },
};

const {map, ap, apFirst,apSecond} = pipeable(form);
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
          }),
      };
    };
  };
}

export type Validator<E, A> = FunctionN<[E], Either<string, A>>;


//looking here, Fresh is on the outside
//https://github.com/lumihq/purescript-lumi-components/blob/27ec237fac5953a49b5b88150bace1add04d3a13/docs/Examples/Form.example.purs#L348
export type Validated<E> = {value:E, modified: boolean};
export function fresh<E>(i: E): Validated<E>{return {value: i, modified: false}}
export function modified<E>(i: E): Validated<E>{return {value: i, modified: true}}

export function validated<E, B>(
  validator: Validator<E, B>,
  renderWithError: (err: string, ui: UIResult) => UIResult
) {
  return function <A>(form: Form<E, A>): Form<Validated<E>, B> {
    return (validatedInput) => {
      const fr = form(validatedInput.value);
      const err = validator(validatedInput.value);

      return {
        ui: onchange => {
          // const onchangeValidate = 
          const ui2 = fr.ui(input => onchange(modified(input)))
          return pipe(
            err,
            fold(
                errStr => validatedInput.modified ? renderWithError(errStr, ui2) : ui2,
                () => ui2
            )
        )},
        result: O.fromEither(err),
      };
    };
  };
}

export function mapUI(f: (ui: React.ReactElement) => React.ReactElement) {
    return function<E,A>(form: Form<E,A>): Form<E,A>{
        return input=> {
            const fr = form(input);
            return {
                result: fr.result,
                ui: onchange => f(fr.ui(onchange))
            }
        }
    }
}