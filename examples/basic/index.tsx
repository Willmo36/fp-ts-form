import * as E from 'fp-ts/lib/Either';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { Lens } from 'monocle-ts';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as F from '../../src/Form';
import * as V from '../../src/Validated';

type PersonFormData = { name: V.Validated<string>; age: V.Validated<string> };
type Person = { name: string; age: number };

// ctor
const person = (name: string) => (age: number): Person => ({ name, age });

// lenses
const _name = Lens.fromProp<PersonFormData>()('name');
const _age = Lens.fromProp<PersonFormData>()('age');

// general inputs
const textbox: F.Form<string, string> = (i) => ({
  ui: (onChange) => <input onChange={(e) => onChange(e.target.value)} />,
  result: O.some(i)
});

const numberInput: F.Form<string, number> = (i) => ({
  ui: (onChange) => (
    <input type="number" onChange={(e) => onChange(e.target.value)} />
  ),
  result: O.some(Number(i))
});

// validators
const nonEmpty: V.Validator<string, string> = E.fromPredicate(
  (str) => str.length > 0,
  () => 'Required'
);

const isPositiveInt: V.Validator<string, number> = (str) => {
  let n = Number(str);
  return !isNaN(n) && n > 0 && n % 1 === 0
    ? E.right(n)
    : E.left('Requires positive number');
};

const renderErr = (err: string, ui: React.ReactElement) => (
  <>
    {ui}
    <p>{err}</p>
  </>
);

const nameForm = pipe(
  textbox,
  V.validated(nonEmpty, renderErr),
  F.focus(_name),
  F.mapUI((ui) => <div>{ui}</div>)
);

const ageForm = pipe(
  numberInput,
  V.validated(isPositiveInt, renderErr),
  F.focus(_age),
  F.mapUI((ui) => <div>{ui}</div>)
);

const personForm = pipe(nameForm, F.map(person), F.ap(ageForm));

const App = () => {
  const [formData, setFormData] = React.useState<PersonFormData>({
    name: V.fresh(''),
    age: V.fresh('')
  });

  const fr = personForm(formData);

  const submit = pipe(
    fr.result,
    O.fold(
      () => <button disabled>Form has errors</button>,
      res => <button onClick={() => alert(`${res.name}, ${res.age}`)}>Submit</button>
    )
  );

  return (
    <div>
      {fr.ui(setFormData)}
      {submit}
    </div>
  );
};

ReactDOM.render(<App />, document.querySelector('#app')!);
