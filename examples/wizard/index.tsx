import { Do } from 'fp-ts-contrib/lib/Do';
import * as E from 'fp-ts/lib/Either';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { Lens } from 'monocle-ts';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as F from '../../src/Form';
import * as V from '../../src/Validated';
import * as W from '../../src/wizard';

type NewPasswordFormData = {
  password: V.Validated<string>;
  confirmPassword: V.Validated<string>;
};

// lenses
const _password = Lens.fromProp<NewPasswordFormData>()('password');
const _confirmPassword = Lens.fromProp<NewPasswordFormData>()('confirmPassword');

// general inputs
const passwordInput: F.Form<string, string> = (i) => ({
  ui: (onChange) => (
    <input type="password" onChange={(e) => onChange(e.target.value)} />
  ),
  result: O.some(i)
});

// validators
const nonEmpty: V.Validator<string, string> = E.fromPredicate(
  (str) => str.length > 0,
  () => 'Required'
);

const mustEq = (source: string): V.Validator<string, string> => E.fromPredicate(
  (target) => target === source,
  () => 'Passwords must be the same'
);

const renderErr = (err: string, ui: React.ReactElement) => (
  <>
    {ui}
    <p>{err}</p>
  </>
);

// to prevent focus loss when mouting/unmounting
// the react fragment with error messages
const divWrap = F.mapUI((ui) => <div>{ui}</div>);

const passwordForm = pipe(
  passwordInput,
  V.validated(nonEmpty, renderErr),
  F.focus(_password),
  divWrap
);

const confirmPasswordForm = (prevPassword: string) => pipe(
  passwordInput,
  V.validated(mustEq(prevPassword), renderErr),
  F.focus(_confirmPassword),
  divWrap
);

const newPasswordForm = W.wizard(
  Do(W.wizard_)
    .bind('password', W.step(passwordForm))
    .doL(ctx => W.step(confirmPasswordForm(ctx.password)))
    .return(ctx => ctx.password)
);

const App = () => {
  const [formData, setFormData] = React.useState<NewPasswordFormData>({ password: V.fresh(''), confirmPassword: V.fresh('') });
  const formResult = newPasswordForm(formData);

  return (
    <div>
      {formResult.ui(setFormData)}
      <p>
      {JSON.stringify(formResult.result)}
      </p>
    </div>
  );
};

ReactDOM.render(<App />, document.querySelector('#app')!);
