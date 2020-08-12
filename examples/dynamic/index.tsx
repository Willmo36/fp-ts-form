import { sequenceS } from 'fp-ts/lib/Apply';
import * as A from 'fp-ts/lib/Array';
import * as E from 'fp-ts/lib/Either';
import { eqNumber } from 'fp-ts/lib/Eq';
import * as M from 'fp-ts/lib/Map';
import * as O from 'fp-ts/lib/Option';
import { ordNumber } from 'fp-ts/lib/Ord';
import { pipe } from 'fp-ts/lib/pipeable';
import { Lens } from 'monocle-ts';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as F from '../../src/Form';
import * as V from '../../src/Validated';

type Team = { teamName: string; players: Map<number, string> };
type TeamFormData = {
	teamName: V.Validated<string>;
	players: PlayersFormData;
};

type PlayersFormData = Map<number, V.Validated<string>>;

// lenses
const _teamName = Lens.fromProp<TeamFormData>()('teamName');
const _players = Lens.fromProp<TeamFormData>()('players');

// general inputs
const textbox: F.Form<string, string> = (i) => ({
	ui: (onChange) => <input onChange={(e) => onChange(e.target.value)} />,
	result: O.some(i)
});

// validators
const nonEmpty: V.Validator<string, string> = E.fromPredicate(
	(str) => str.length > 0,
	() => 'Required'
);

const renderErr = (err: string, ui: React.ReactElement) => (
	<>
		{ui}
		<p>{err}</p>
	</>
);

const teamNameForm: F.Form<TeamFormData, string> = pipe(
	textbox,
	V.validated(nonEmpty, renderErr),
	F.focus(_teamName),
	F.mapUI((ui) => <div>{ui}</div>) // maintain focus
);

const monoidPlayersForm = F.getMonoid<PlayersFormData, Map<number, string>>(
	M.getMonoid(eqNumber, { concat: (_a, b) => b }) // semigroup which takes the latest
);

const playersForm_: F.Form<PlayersFormData, Map<number, string>> = (playersFormData) =>
	pipe(
		playersFormData,
		M.toArray(ordNumber),
		A.map(([id, playerName]) => {
			const playerForm = pipe(
				textbox,
				V.validated(nonEmpty, renderErr),
				F.mapUI((form) => (
					<div>
						<span>Player {id}</span>
						<div>{form}</div>
					</div>
				)),
				F.map((nextName) => new Map([[id, nextName]])) // return a single entry Map which we'll later combine back into the larger map with semigroup
			);

			const playerFormResult = playerForm(playerName);

			const indexedForm: F.Form<PlayersFormData, Map<number, string>> = (i2) => ({
				result: playerFormResult.result,
				ui: (onchange) =>
					playerFormResult.ui((nextName) => {
						const next = M.insertAt(eqNumber)(id, nextName)(i2);
						onchange(next);
					})
			});

			return indexedForm;
		}),
		(forms) => forms.reduce(monoidPlayersForm.concat, monoidPlayersForm.empty),
		(form) => form(playersFormData)
	);

const teamForm: F.Form<TeamFormData, Team> = sequenceS(F.form)({
	teamName: teamNameForm,
	players: pipe(playersForm_, F.focus(_players))
});

const App = () => {
	const [formData, setFormData] = React.useState<TeamFormData>({ teamName: V.fresh(''), players: new Map() });
	const formResult = teamForm(formData);

	const addPlayer = () => {
		const newPlayerId = playerId++;
		const addEmptyPlayer = M.insertAt(eqNumber)(newPlayerId, V.fresh(''));
		setFormData(_players.modify(addEmptyPlayer));
	};

	return (
		<div>
			{formResult.ui(setFormData)}
			<button onClick={addPlayer}>Add Player</button>
			<p>{JSON.stringify(formResult.result)}</p>
		</div>
	);
};

ReactDOM.render(<App />, document.querySelector('#app')!);
let playerId = 1;
