import { Do } from "fp-ts-contrib/lib/Do";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { Lens } from "monocle-ts";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as F from "../../src";
import * as W from "../../src/wizard";

type NewPasswordFormData = {
  password: F.Validated<string>;
  confirmPassword: F.Validated<string>;
};

//lenses
const _password = Lens.fromProp<NewPasswordFormData>()("password");
const _confirmPassword = Lens.fromProp<NewPasswordFormData>()("confirmPassword");

//general inputs
const passwordInput: F.Form<string, string> = (i) => ({
  ui: (onChange) => (
    <input type="password" onChange={(e) => onChange(e.target.value)} />
  ),
  result: O.some(i),
});

//validators
const nonEmpty: F.Validator<string, string> = E.fromPredicate(
  (str) => str.length > 0,
  () => "Required"
);

const mustEq = (source: string): F.Validator<string, string> => E.fromPredicate(
  (target) => target === source,
  () => "Passwords must be the same"
);

const renderErr = (err: string, ui: React.ReactElement) => (
  <>
    {ui}
    <p>{err}</p>
  </>
);

//to prevent focus loss when mouting/unmounting
//the react fragment with error messages
const divWrap = F.mapUI((ui) => <div>{ui}</div>)

const passwordForm = pipe(
  passwordInput,
  F.validated(nonEmpty, renderErr),
  F.focus(_password),
  divWrap,
)

const confirmPasswordForm = (prevPassword: string) => pipe(
  passwordInput,
  F.validated(mustEq(prevPassword), renderErr),
  F.focus(_confirmPassword),
  divWrap
)

const newPasswordForm = W.wizard(
  Do(W.wizard_)
    .bind("password", W.step(passwordForm))
    .doL(ctx => W.step(confirmPasswordForm(ctx.password)))
    .return(ctx => ctx.password)
);

const App = () => {
  const [formData, setFormData] = React.useState<NewPasswordFormData>({password: F.fresh(""), confirmPassword: F.fresh("")});
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

ReactDOM.render(<App />, document.querySelector("#app")!);
